// iFood Catalog API — Homologação
// Implementa o módulo "Catalog" exigido na homologação:
//
// Endpoints proxiados (com auth iFood + tratamento padrão de erros):
//  - GET   /merchants/{merchantId}/catalogs                                    → list catalogs
//  - GET   /merchants/{merchantId}/catalogs/{catalogId}/categories             → list categories
//  - POST  /merchants/{merchantId}/catalogs/{catalogId}/categories             → create category
//  - PUT   /merchants/{merchantId}/items                                       → create/edit item
//  - PATCH /merchants/{merchantId}/items/price                                 → change item price
//  - PATCH /merchants/{merchantId}/items/status                                → change item status
//  - PATCH /merchants/{merchantId}/options/price                               → change option price
//  - PATCH /merchants/{merchantId}/options/status                              → change option status
//  - POST  /merchants/{merchantId}/image/upload                                → upload image
//
// Critérios atendidos:
//  - Validação de JWT do usuário (admin do cliente)
//  - Reaproveita ifood_token_cache (renova só quando expirado)
//  - Backoff exponencial em HTTP 429 (Retry-After respeitado)
//  - Erros padronizados: { code, message } + httpStatus original
//  - Sem expor detalhes internos em 500
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IFOOD_BASE = "https://merchant-api.ifood.com.br";
const CATALOG_PREFIX = "/catalog/v2.0";

async function fetchWithBackoff(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (true) {
    const resp = await fetch(url, init);
    if ((resp.status !== 429 && resp.status < 500) || attempt >= maxRetries) return resp;
    const retryAfter = Number(resp.headers.get("retry-after") ?? 0);
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 500, 4000);
    console.warn(`[ifood-catalog] HTTP ${resp.status} em ${url}, aguardando ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    attempt++;
  }
}

async function getIfoodToken(supabase: any, environment: string): Promise<string> {
  const { data: cached } = await supabase
    .from("ifood_token_cache")
    .select("access_token, expires_at")
    .eq("environment", environment)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date(Date.now() + 60_000)) {
    return cached.access_token;
  }

  const clientId = Deno.env.get("IFOOD_CLIENT_ID");
  const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("IFOOD_CLIENT_ID/SECRET não configurados");

  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId,
    clientSecret,
  });

  const resp = await fetchWithBackoff(`${IFOOD_BASE}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    throw new Error(`Auth iFood falhou [${resp.status}]: ${await resp.text()}`);
  }
  const data = await resp.json();
  const expiresAt = new Date(Date.now() + (data.expiresIn ?? 10800) * 1000).toISOString();

  await supabase
    .from("ifood_token_cache")
    .upsert({ environment, access_token: data.accessToken, expires_at: expiresAt }, { onConflict: "environment" });

  return data.accessToken;
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function parseError(resp: Response) {
  const text = await resp.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* noop */ }
  const code =
    parsed?.code ??
    parsed?.error ??
    (resp.status === 401 ? "Unauthorized"
      : resp.status === 403 ? "Forbidden"
      : resp.status === 404 ? "NotFound"
      : resp.status === 409 ? "Conflict"
      : resp.status === 429 ? "TooManyRequests"
      : resp.status === 400 ? "BadRequest"
      : "UpstreamError");
  const message =
    parsed?.message ??
    parsed?.error_description ??
    (resp.status >= 500 ? "Erro temporário no provedor. Tente novamente." : text || "Erro na requisição");
  return {
    ok: false,
    status: resp.status,
    code,
    message,
    retryAfter: resp.headers.get("retry-after") ?? undefined,
    raw: parsed ?? text,
  };
}

async function callIfood(
  token: string,
  method: string,
  path: string,
  body?: any,
): Promise<{ ok: true; status: number; data: any } | Awaited<ReturnType<typeof parseError>>> {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const resp = await fetchWithBackoff(`${IFOOD_BASE}${path}`, init);

  if (resp.status === 204) return { ok: true, status: 204, data: null };

  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!resp.ok) {
    const fakeResp = new Response(typeof data === "string" ? data : JSON.stringify(data ?? {}), {
      status: resp.status,
      headers: resp.headers,
    });
    return await parseError(fakeResp);
  }
  return { ok: true, status: resp.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1) Autenticação do usuário admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ ok: false, code: "Unauthorized", message: "Token ausente" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: uErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (uErr || !userData?.user) {
      return jsonResponse({ ok: false, code: "Unauthorized", message: "Token inválido" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("client_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile?.client_id) {
      return jsonResponse({ ok: false, code: "Forbidden", message: "Cliente não identificado" }, 403);
    }

    const { data: client } = await admin
      .from("clients")
      .select("ifood_enabled")
      .eq("id", profile.client_id)
      .maybeSingle();
    if (!client?.ifood_enabled) {
      return jsonResponse({ ok: false, code: "Forbidden", message: "Integração iFood não habilitada" }, 403);
    }

    const { data: cred } = await admin
      .from("ifood_credentials")
      .select("merchant_id, environment, active")
      .eq("client_id", profile.client_id)
      .maybeSingle();
    if (!cred?.active) {
      return jsonResponse({ ok: false, code: "Forbidden", message: "Credenciais iFood não configuradas" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "";

    const token = await getIfoodToken(admin, cred.environment);
    const mid = body?.merchantId || cred.merchant_id;

    let result;
    switch (action) {
      // ─── CATÁLOGOS ────────────────────────────────────────────────
      case "list_catalogs":
        result = await callIfood(token, "GET", `${CATALOG_PREFIX}/merchants/${mid}/catalogs`);
        break;

      // ─── CATEGORIAS ───────────────────────────────────────────────
      case "list_categories": {
        const { catalogId } = body;
        if (!catalogId) {
          return jsonResponse({ ok: false, code: "BadRequest", message: "catalogId obrigatório" }, 400);
        }
        const includeItems = body?.includeItems ? "?includeItems=true" : "";
        result = await callIfood(
          token,
          "GET",
          `${CATALOG_PREFIX}/merchants/${mid}/catalogs/${catalogId}/categories${includeItems}`,
        );
        break;
      }

      case "create_category": {
        const { catalogId, name, externalCode, status, index, template } = body;
        if (!catalogId || !name) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "catalogId e name são obrigatórios" },
            400,
          );
        }
        result = await callIfood(
          token,
          "POST",
          `${CATALOG_PREFIX}/merchants/${mid}/catalogs/${catalogId}/categories`,
          {
            name,
            externalCode: externalCode ?? undefined,
            status: status ?? "AVAILABLE",
            index: index ?? 0,
            template: template ?? "DEFAULT",
          },
        );
        break;
      }

      // ─── ITENS ────────────────────────────────────────────────────
      case "upsert_item": {
        // PUT /items — cria OU edita (idempotente). Payload completo do item.
        const { item } = body;
        if (!item || !item.categoryId) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "item.categoryId obrigatório" },
            400,
          );
        }
        result = await callIfood(token, "PUT", `${CATALOG_PREFIX}/merchants/${mid}/items`, item);
        break;
      }

      case "update_item_price": {
        const { itemId, price } = body;
        if (!itemId || !price) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "itemId e price obrigatórios" },
            400,
          );
        }
        result = await callIfood(token, "PATCH", `${CATALOG_PREFIX}/merchants/${mid}/items/price`, {
          itemId,
          price, // { value, originalValue, scheduledDiscount? }
        });
        break;
      }

      case "update_item_status": {
        const { itemId, status } = body;
        if (!itemId || !status) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "itemId e status obrigatórios" },
            400,
          );
        }
        result = await callIfood(token, "PATCH", `${CATALOG_PREFIX}/merchants/${mid}/items/status`, {
          itemId,
          status, // AVAILABLE | UNAVAILABLE
        });
        break;
      }

      // ─── COMPLEMENTOS (OPTIONS) ───────────────────────────────────
      case "update_option_price": {
        const { optionId, price } = body;
        if (!optionId || !price) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "optionId e price obrigatórios" },
            400,
          );
        }
        result = await callIfood(token, "PATCH", `${CATALOG_PREFIX}/merchants/${mid}/options/price`, {
          optionId,
          price,
        });
        break;
      }

      case "update_option_status": {
        const { optionId, status } = body;
        if (!optionId || !status) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "optionId e status obrigatórios" },
            400,
          );
        }
        result = await callIfood(token, "PATCH", `${CATALOG_PREFIX}/merchants/${mid}/options/status`, {
          optionId,
          status,
        });
        break;
      }

      // ─── UPLOAD DE IMAGEM ─────────────────────────────────────────
      case "upload_image": {
        // Recebe base64 (data URL ou puro). Envia como { image: "<base64>" }
        const { image } = body;
        if (!image || typeof image !== "string") {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "image (base64) obrigatória" },
            400,
          );
        }
        const clean = image.includes(",") ? image.split(",")[1] : image;
        result = await callIfood(
          token,
          "POST",
          `${CATALOG_PREFIX}/merchants/${mid}/image/upload`,
          { image: clean },
        );
        break;
      }

      default:
        return jsonResponse({ ok: false, code: "BadRequest", message: `action desconhecida: ${action}` }, 400);
    }

    if (!("ok" in result) || !result.ok) {
      return jsonResponse(result, (result as any).status ?? 502);
    }

    return jsonResponse({ ok: true, status: result.status, data: result.data }, 200);
  } catch (e) {
    console.error("[ifood-catalog] erro:", e);
    return jsonResponse(
      { ok: false, code: "InternalError", message: "Erro interno. Tente novamente em instantes." },
      500,
    );
  }
});
