// iFood Poller — consome eventos do iFood a cada 30s para clientes com ifood_enabled=true
// Pode ser chamado manualmente OU via pg_cron
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_BASE_SANDBOX = "https://merchant-api.ifood.com.br";
const IFOOD_BASE_PROD = "https://merchant-api.ifood.com.br";

async function getIfoodToken(supabase: any, environment: string): Promise<string> {
  // Verifica cache
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

  const base = environment === "production" ? IFOOD_BASE_PROD : IFOOD_BASE_SANDBOX;
  const resp = await fetch(`${base}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Auth iFood falhou [${resp.status}]: ${errText}`);
  }

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + (data.expiresIn ?? 10800) * 1000).toISOString();

  await supabase
    .from("ifood_token_cache")
    .upsert({ environment, access_token: data.accessToken, expires_at: expiresAt }, { onConflict: "environment" });

  return data.accessToken;
}

async function fetchOrderDetails(base: string, token: string, orderId: string) {
  const resp = await fetch(`${base}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  return await resp.json();
}

async function processClient(supabase: any, cred: any) {
  const base = cred.environment === "production" ? IFOOD_BASE_PROD : IFOOD_BASE_SANDBOX;
  const token = await getIfoodToken(supabase, cred.environment);

  // Polling de eventos
  const pollResp = await fetch(`${base}/events/v1.0/events:polling`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-polling-merchants": cred.merchant_id,
    },
  });

  // 204 = sem eventos novos
  if (pollResp.status === 204) {
    await supabase
      .from("ifood_credentials")
      .update({ last_polling_at: new Date().toISOString() })
      .eq("id", cred.id);
    return { events: 0 };
  }

  if (!pollResp.ok) {
    const errText = await pollResp.text();
    throw new Error(`Polling falhou [${pollResp.status}]: ${errText}`);
  }

  const events = await pollResp.json();
  if (!Array.isArray(events) || events.length === 0) {
    return { events: 0 };
  }

  const ackIds: string[] = [];
  let processed = 0;

  for (const evt of events) {
    const eventId = evt.id ?? evt.eventId ?? crypto.randomUUID();
    const eventType = evt.code ?? evt.fullCode ?? "UNKNOWN";
    const orderExternalId = evt.orderId ?? null;

    // Salva log (idempotente via UNIQUE)
    const { error: logErr } = await supabase.from("ifood_event_log").insert({
      client_id: cred.client_id,
      event_id: String(eventId),
      event_type: String(eventType),
      order_external_id: orderExternalId,
      payload: evt,
      processed: false,
    });

    // Se já existia (duplicado), só faz ack
    if (logErr && !logErr.message?.includes("duplicate")) {
      console.error("Erro ao logar evento:", logErr);
      continue;
    }

    ackIds.push(String(eventId));

    // Processa eventos de pedido novo
    if (eventType === "PLACED" && orderExternalId) {
      try {
        const details = await fetchOrderDetails(base, token, orderExternalId);
        if (details) {
          // Verifica se já existe
          const { data: existing } = await supabase
            .from("orders")
            .select("id")
            .eq("client_id", cred.client_id)
            .eq("external_order_id", orderExternalId)
            .maybeSingle();

          if (!existing) {
            const items = (details.items ?? []).map((it: any) => ({
              product_name: it.name,
              quantity: it.quantity ?? 1,
              unit_price: Number(it.unitPrice ?? it.price ?? 0),
              total_price: Number(it.totalPrice ?? it.price ?? 0),
              observations: it.observations ?? null,
              complements: it.options ?? null,
            }));

            const { data: newOrder, error: ordErr } = await supabase
              .from("orders")
              .insert({
                client_id: cred.client_id,
                customer_name: details.customer?.name ?? "Cliente iFood",
                total_amount: Number(details.total?.orderAmount ?? details.totalPrice ?? 0),
                payment_method: details.payments?.methods?.[0]?.method ?? "ifood",
                status: "novo",
                origin: "ifood",
                external_order_id: orderExternalId,
                ifood_status: "PLACED",
                approval_status: "pendente",
              })
              .select()
              .single();

            if (ordErr) throw ordErr;

            if (items.length > 0 && newOrder) {
              await supabase.from("order_items").insert(
                items.map((it: any) => ({ ...it, order_id: newOrder.id, client_id: cred.client_id }))
              );
            }
          }
        }
      } catch (e) {
        console.error("Erro ao criar pedido iFood:", e);
        await supabase
          .from("ifood_event_log")
          .update({ error_message: String(e) })
          .eq("client_id", cred.client_id)
          .eq("event_id", String(eventId));
        continue;
      }
    }

    // Marca processado
    await supabase
      .from("ifood_event_log")
      .update({ processed: true })
      .eq("client_id", cred.client_id)
      .eq("event_id", String(eventId));
    processed++;
  }

  // Acknowledgment dos eventos
  if (ackIds.length > 0) {
    await fetch(`${base}/events/v1.0/events/acknowledgment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(ackIds.map((id) => ({ id }))),
    });
  }

  await supabase
    .from("ifood_credentials")
    .update({ last_polling_at: new Date().toISOString() })
    .eq("id", cred.id);

  return { events: processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca clientes com iFood habilitado
    const { data: enabledClients, error: clientsErr } = await supabase
      .from("clients")
      .select("id")
      .eq("ifood_enabled", true);
    if (clientsErr) throw clientsErr;

    const enabledIds = (enabledClients ?? []).map((c: any) => c.id);
    if (enabledIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca credenciais ativas desses clientes
    const { data: creds, error } = await supabase
      .from("ifood_credentials")
      .select("id, client_id, merchant_id, environment, active")
      .eq("active", true)
      .in("client_id", enabledIds);

    if (error) throw error;

    const results: any[] = [];
    for (const cred of creds ?? []) {
      try {
        const r = await processClient(supabase, cred);
        results.push({ client_id: cred.client_id, ...r });
      } catch (e) {
        console.error(`Erro processando cliente ${cred.client_id}:`, e);
        results.push({ client_id: cred.client_id, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro no poller:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
