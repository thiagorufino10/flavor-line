// iFood Merchant API — Homologação
// Implementa o módulo "Merchant" exigido na homologação:
//
// Endpoints proxiados (com auth iFood + tratamento padrão de erros):
//  - GET    /merchants                                 → list
//  - GET    /merchants/{merchantId}                    → details
//  - GET    /merchants/{merchantId}/status             → status (OK/WARNING/CLOSED/ERROR)
//  - GET    /merchants/{merchantId}/interruptions     → list
//  - POST   /merchants/{merchantId}/interruptions     → create (201)
//  - DELETE /merchants/{merchantId}/interruptions/{id}→ delete (204)
//  - GET    /merchants/{merchantId}/opening-hours     → list
//  - PUT    /merchants/{merchantId}/opening-hours     → update (201)
//
// Critérios atendidos:
//  - Validação de JWT do usuário (admin do cliente)
//  - Reaproveita ifood_token_cache (renova só quando expirado)
//  - Backoff exponencial em HTTP 429 (Retry-After respeitado)
//  - Erros padronizados: { code, message } + httpStatus original
//  - Polling mínimo de 30s para status (controlado pelo client)
//  - Sem expor detalhes internos em 500
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IFOOD_BASE = "https://merchant-api.ifood.com.br";
const MERCHANT_PREFIX = "/merchant/v1.0";

async function fetchWithBackoff(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (true) {
    const resp = await fetch(url, init);
    if ((resp.status !== 429 && resp.status < 500) || attempt >= maxRetries) return resp;
    const retryAfter = Number(resp.headers.get("retry-after") ?? 0);
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 500, 4000);
    console.warn(`[iFood Merchant] HTTP ${resp.status} em ${url}, aguardando ${wait}ms`);
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

// Padroniza erro upstream → { ok:false, status, code, message, retryAfter? }
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

  // 204 No Content
  if (resp.status === 204) return { ok: true, status: 204, data: null };

  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!resp.ok) {
    // Reconstrói para reaproveitar parseError
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

    // Recupera client_id do profile + valida feature flag
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

    // Recupera credenciais (merchant_id + environment)
    const { data: cred } = await admin
      .from("ifood_credentials")
      .select("merchant_id, environment, active")
      .eq("client_id", profile.client_id)
      .maybeSingle();
    if (!cred?.active) {
      return jsonResponse({ ok: false, code: "Forbidden", message: "Credenciais iFood não configuradas" }, 403);
    }

    // 2) Roteamento por action
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "";

    const token = await getIfoodToken(admin, cred.environment);
    const mid = body?.merchantId || cred.merchant_id;

    let result;
    switch (action) {
      case "list_merchants":
        result = await callIfood(token, "GET", `${MERCHANT_PREFIX}/merchants`);
        break;

      case "get_merchant":
        result = await callIfood(token, "GET", `${MERCHANT_PREFIX}/merchants/${mid}`);
        break;

      case "get_status":
        result = await callIfood(token, "GET", `${MERCHANT_PREFIX}/merchants/${mid}/status`);
        break;

      case "list_interruptions":
        result = await callIfood(token, "GET", `${MERCHANT_PREFIX}/merchants/${mid}/interruptions`);
        break;

      case "create_interruption": {
        const { description, start, end } = body;
        if (!description || !start || !end) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "description, start e end são obrigatórios" },
            400,
          );
        }
        result = await callIfood(token, "POST", `${MERCHANT_PREFIX}/merchants/${mid}/interruptions`, {
          description,
          start,
          end,
        });
        break;
      }

      case "delete_interruption": {
        const { interruptionId } = body;
        if (!interruptionId) {
          return jsonResponse({ ok: false, code: "BadRequest", message: "interruptionId obrigatório" }, 400);
        }
        result = await callIfood(
          token,
          "DELETE",
          `${MERCHANT_PREFIX}/merchants/${mid}/interruptions/${interruptionId}`,
        );
        break;
      }

      case "get_opening_hours":
        result = await callIfood(token, "GET", `${MERCHANT_PREFIX}/merchants/${mid}/opening-hours`);
        console.log("[ifood-merchant] GET opening-hours response:", JSON.stringify(result));
        break;

      case "update_opening_hours": {
        const { shifts } = body;
        if (!Array.isArray(shifts)) {
          return jsonResponse(
            { ok: false, code: "BadRequest", message: "shifts (array) obrigatório" },
            400,
          );
        }
        // iFood: para fechar um dia, ele NÃO deve estar no array.
        // Removemos qualquer shift com duration <= 0 ou enabled=false.
        const cleanShifts = shifts.filter(
          (s: any) => s && s.enabled !== false && Number(s.duration) > 0,
        );
        console.log("[ifood-merchant] PUT opening-hours payload:", JSON.stringify({ shifts: cleanShifts }));
        result = await callIfood(
          token,
          "PUT",
          `${MERCHANT_PREFIX}/merchants/${mid}/opening-hours`,
          { shifts: cleanShifts },
        );
        console.log("[ifood-merchant] PUT opening-hours response:", JSON.stringify(result));
        break;
      }

      default:
        return jsonResponse({ ok: false, code: "BadRequest", message: `action desconhecida: ${action}` }, 400);
    }

    if (!("ok" in result) || !result.ok) {
      // Erro upstream — repassamos status original + payload normalizado
      return jsonResponse(result, (result as any).status ?? 502);
    }

    return jsonResponse({ ok: true, status: result.status, data: result.data }, 200);
  } catch (e) {
    console.error("[ifood-merchant] erro:", e);
    return jsonResponse(
      { ok: false, code: "InternalError", message: "Erro interno. Tente novamente em instantes." },
      500,
    );
  }
});
