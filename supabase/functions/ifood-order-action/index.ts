// iFood Order Action — confirm / dispatch / cancel / readyToPickup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_BASE = "https://merchant-api.ifood.com.br";

const VALID_ACTIONS = ["confirm", "dispatch", "cancel", "readyToPickup"];

async function getIfoodToken(supabase: any, environment: string): Promise<string> {
  const { data: cached } = await supabase
    .from("ifood_token_cache")
    .select("access_token, expires_at")
    .eq("environment", environment)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date(Date.now() + 60_000)) {
    return cached.access_token;
  }

  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId: Deno.env.get("IFOOD_CLIENT_ID")!,
    clientSecret: Deno.env.get("IFOOD_CLIENT_SECRET")!,
  });

  const resp = await fetch(`${IFOOD_BASE}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) throw new Error(`Auth iFood falhou: ${await resp.text()}`);
  const data = await resp.json();
  const expiresAt = new Date(Date.now() + (data.expiresIn ?? 10800) * 1000).toISOString();

  await supabase
    .from("ifood_token_cache")
    .upsert({ environment, access_token: data.accessToken, expires_at: expiresAt }, { onConflict: "environment" });

  return data.accessToken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { orderId, action, cancellationCode, cancellationReason } = body;

    if (!orderId || !action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca o profile + role do usuário
    const { data: profile } = await admin
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.client_id) {
      return new Response(JSON.stringify({ error: "Usuário sem cliente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("client_id", profile.client_id);

    const roleNames = (roles ?? []).map((r: any) => r.role);
    if (!roleNames.includes("admin") && !roleNames.includes("atendente")) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca o pedido + credenciais
    const { data: order } = await admin
      .from("orders")
      .select("id, external_order_id, client_id, origin")
      .eq("id", orderId)
      .eq("client_id", profile.client_id)
      .maybeSingle();

    if (!order || order.origin !== "ifood" || !order.external_order_id) {
      return new Response(JSON.stringify({ error: "Pedido iFood não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cred } = await admin
      .from("ifood_credentials")
      .select("environment")
      .eq("client_id", order.client_id)
      .maybeSingle();

    const environment = cred?.environment ?? "sandbox";
    const token = await getIfoodToken(admin, environment);

    const url = `${IFOOD_BASE}/order/v1.0/orders/${order.external_order_id}/${action}`;
    const reqBody: any = {};
    if (action === "cancel") {
      reqBody.reason = cancellationReason ?? "Cancelado pelo estabelecimento";
      reqBody.cancellationCode = cancellationCode ?? "501";
    }

    const ifoodResp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: action === "cancel" ? JSON.stringify(reqBody) : undefined,
    });

    if (!ifoodResp.ok && ifoodResp.status !== 202) {
      const errText = await ifoodResp.text();
      return new Response(JSON.stringify({ error: `iFood [${ifoodResp.status}]: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza status local
    const updates: any = {};
    if (action === "confirm") {
      updates.ifood_status = "CONFIRMED";
      updates.approval_status = "aprovado";
      updates.status = "preparando";
    } else if (action === "dispatch") {
      updates.ifood_status = "DISPATCHED";
      updates.status = "finalizado";
    } else if (action === "readyToPickup") {
      updates.ifood_status = "READY_TO_PICKUP";
      updates.status = "pronto";
    } else if (action === "cancel") {
      updates.ifood_status = "CANCELLED";
      updates.approval_status = "rejeitado";
      updates.status = "cancelado";
    }

    await admin.from("orders").update(updates).eq("id", order.id);

    return new Response(JSON.stringify({ ok: true, action, ifood_status: updates.ifood_status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro action:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
