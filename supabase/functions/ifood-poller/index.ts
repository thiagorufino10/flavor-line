// iFood Poller — Homologação Order API
// - Polling 30s (chamado pelo cron)
// - Acknowledgment de TODOS os eventos (mesmo duplicados ou com erro)
// - Detecção de duplicatas via UNIQUE(client_id, event_id)
// - Processa eventos: PLC/PLACED, CFM/CONFIRMED, DSP/DISPATCHED, CON/CONCLUDED,
//   RTP/READY_TO_PICKUP, CAN/CANCELLED (sincronização entre apps)
// - Eventos da Plataforma de Negociação: HMC/HANDSHAKE, HMD/HANDSHAKE_DECLINED
// - Captura completa do payload do pedido (orderType, orderTiming, payments,
//   benefits, customer, pickupCode, observations, deliveryAddress)
// - Backoff em rate limit (HTTP 429)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_BASE = "https://merchant-api.ifood.com.br";

// --------- Utilitários ----------
async function fetchWithBackoff(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (true) {
    const resp = await fetch(url, init);
    if (resp.status !== 429 || attempt >= maxRetries) return resp;
    const retryAfter = Number(resp.headers.get("retry-after") ?? 0);
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 500, 4000);
    console.warn(`[iFood] 429 em ${url}, aguardando ${wait}ms (attempt ${attempt + 1})`);
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

  // Renova SOMENTE se expirado (margem de 60s)
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

async function fetchOrderDetails(token: string, orderId: string) {
  const resp = await fetchWithBackoff(`${IFOOD_BASE}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    console.error(`Falha ao buscar pedido ${orderId}: ${resp.status}`);
    return null;
  }
  return await resp.json();
}

// Mapa de codes (curtos) -> tipo lógico
function classifyEvent(code: string): string {
  const c = (code || "").toUpperCase();
  if (c === "PLC" || c === "PLACED") return "PLACED";
  if (c === "CFM" || c === "CONFIRMED") return "CONFIRMED";
  if (c === "DSP" || c === "DISPATCHED") return "DISPATCHED";
  if (c === "CON" || c === "CONCLUDED") return "CONCLUDED";
  if (c === "RTP" || c === "READY_TO_PICKUP") return "READY_TO_PICKUP";
  if (c === "CAN" || c === "CANCELLED" || c === "CANCELED") return "CANCELLED";
  if (c === "CRE" || c === "CANCELLATION_REQUESTED") return "CANCELLATION_REQUESTED";
  if (c === "HMC") return "HANDSHAKE_CONFIRMED";
  if (c === "HMD") return "HANDSHAKE_DECLINED";
  return c;
}

// Atualização local quando chega evento de mudança de status (sincronização)
function statusUpdatesFromEvent(eventLogical: string): Record<string, any> | null {
  switch (eventLogical) {
    case "CONFIRMED":
      return { ifood_status: "CONFIRMED", approval_status: "aprovado", status: "novo" };
    case "DISPATCHED":
      return { ifood_status: "DISPATCHED", status: "finalizado" };
    case "READY_TO_PICKUP":
      return { ifood_status: "READY_TO_PICKUP", status: "pronto" };
    case "CONCLUDED":
      return { ifood_status: "CONCLUDED", status: "finalizado" };
    case "CANCELLED":
      return { ifood_status: "CANCELLED", approval_status: "rejeitado", status: "cancelado" };
    case "CANCELLATION_REQUESTED":
      return { ifood_status: "CANCELLATION_REQUESTED" };
    default:
      return null;
  }
}

async function upsertOrderFromIfood(supabase: any, clientId: string, details: any) {
  const externalId = details.id ?? details.orderId;
  if (!externalId) return null;

  // Verifica se já existe
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("client_id", clientId)
    .eq("external_order_id", externalId)
    .maybeSingle();

  // Campos derivados
  const orderType = details.orderType ?? null; // DELIVERY | TAKEOUT | INDOOR
  const orderTiming = details.orderTiming ?? null; // IMMEDIATE | SCHEDULED
  const scheduledFor =
    details.schedule?.deliveryDateTimeStart ?? details.scheduledDateTime ?? null;
  const pickupCode = details.takeout?.takeoutDateTime ? null : details.pickupCode ?? details.takeout?.pickupCode ?? null;

  const payment = details.payments?.methods?.[0] ?? details.payments?.[0] ?? {};
  const rawPaymentMethod = (payment.method ?? payment.code ?? payment.type ?? "").toString().toLowerCase();
  // Normaliza para um dos 4 métodos + sufixo " ifood" (ex: "credito ifood", "pix ifood")
  const normalizeIfoodMethod = (raw: string): string => {
    const r = raw.toLowerCase();
    if (r.includes("pix")) return "pix ifood";
    if (r.includes("cash") || r.includes("dinheiro") || r.includes("money")) return "dinheiro ifood";
    if (r.includes("debit") || r.includes("debito") || r.includes("vr") || r.includes("va") || r.includes("voucher") || r.includes("meal") || r.includes("food")) return "debito ifood";
    if (r.includes("credit") || r.includes("credito") || r.includes("card")) return "credito ifood";
    // Default: trata pagamento online iFood como crédito
    return "credito ifood";
  };
  const paymentMethodLabel = normalizeIfoodMethod(rawPaymentMethod);

  const totalAmount = Number(
    details.total?.orderAmount ??
      details.totalPrice ??
      details.total ??
      0
  );

  const customerName = details.customer?.name ?? "Cliente iFood";

  if (existing) {
    // Atualiza payload caso já tenhamos o pedido (evita perder dados ricos)
    await supabase
      .from("orders")
      .update({
        ifood_payload: details,
        ifood_order_type: orderType,
        ifood_order_timing: orderTiming,
        ifood_pickup_code: pickupCode,
        ifood_scheduled_for: scheduledFor,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const items = (details.items ?? []).map((it: any) => ({
    product_name: it.name,
    quantity: it.quantity ?? 1,
    unit_price: Number(it.unitPrice ?? it.price ?? 0),
    total_price: Number(it.totalPrice ?? it.price ?? 0),
    observations: it.observations ?? null,
    complements: it.options ?? it.subItems ?? null,
  }));

  const { data: newOrder, error: ordErr } = await supabase
    .from("orders")
    .insert({
      client_id: clientId,
      customer_name: customerName,
      total_amount: totalAmount,
      payment_method: paymentMethodLabel,
      status: "novo",
      origin: "ifood",
      external_order_id: externalId,
      ifood_status: "PLACED",
      approval_status: "pendente",
      ifood_payload: details,
      ifood_order_type: orderType,
      ifood_order_timing: orderTiming,
      ifood_pickup_code: pickupCode,
      ifood_scheduled_for: scheduledFor,
    })
    .select()
    .single();

  if (ordErr) throw ordErr;

  if (items.length > 0 && newOrder) {
    await supabase.from("order_items").insert(
      items.map((it: any) => ({ ...it, order_id: newOrder.id, client_id: clientId }))
    );
  }
  return newOrder?.id ?? null;
}

async function processClient(supabase: any, cred: any) {
  const token = await getIfoodToken(supabase, cred.environment);

  // 1) Polling de eventos
  const pollResp = await fetchWithBackoff(`${IFOOD_BASE}/events/v1.0/events:polling`, {
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
    throw new Error(`Polling falhou [${pollResp.status}]: ${await pollResp.text()}`);
  }

  const events = await pollResp.json();
  if (!Array.isArray(events) || events.length === 0) {
    return { events: 0 };
  }

  // ackIds inclui TODOS os eventos recebidos (mesmo duplicados ou que falham processamento)
  // A homologação exige ack de tudo.
  const ackIds: string[] = [];
  let processed = 0;

  for (const evt of events) {
    const eventId = String(evt.id ?? evt.eventId ?? crypto.randomUUID());
    const rawCode = String(evt.code ?? evt.fullCode ?? "UNKNOWN");
    const eventLogical = classifyEvent(rawCode);
    const orderExternalId = evt.orderId ?? null;

    ackIds.push(eventId);

    // Tenta inserir log. Se duplicado (UNIQUE), descarta silenciosamente.
    const { error: logErr } = await supabase.from("ifood_event_log").insert({
      client_id: cred.client_id,
      event_id: eventId,
      event_type: rawCode,
      order_external_id: orderExternalId,
      payload: evt,
      processed: false,
    });

    if (logErr) {
      // Duplicata → já processado anteriormente, só faz ack
      const isDup = (logErr.message ?? "").toLowerCase().includes("duplicate");
      if (!isDup) console.error("Erro ao logar evento:", logErr);
      continue;
    }

    try {
      // PLACED → cria pedido para aprovação manual
      if (eventLogical === "PLACED" && orderExternalId) {
        const details = await fetchOrderDetails(token, orderExternalId);
        if (details) {
          await upsertOrderFromIfood(supabase, cred.client_id, details);
        }
      }

      // CONFIRMED/DISPATCHED/READY_TO_PICKUP/CONCLUDED/CANCELLED → sincroniza status local
      // (caso outro app — Gestor de Pedidos Web, app do iFood — tenha movido o pedido)
      const updates = statusUpdatesFromEvent(eventLogical);
      if (updates && orderExternalId) {
        await supabase
          .from("orders")
          .update(updates)
          .eq("client_id", cred.client_id)
          .eq("external_order_id", orderExternalId);
      }

      // Eventos da Plataforma de Negociação — apenas registramos, sem alterar pedido.
      // (Visíveis na aba "Eventos recebidos")

      await supabase
        .from("ifood_event_log")
        .update({ processed: true })
        .eq("client_id", cred.client_id)
        .eq("event_id", eventId);
      processed++;
    } catch (e) {
      console.error(`Erro processando evento ${eventId} (${rawCode}):`, e);
      await supabase
        .from("ifood_event_log")
        .update({ error_message: String(e) })
        .eq("client_id", cred.client_id)
        .eq("event_id", eventId);
      // ack mesmo em erro (homologação exige)
    }
  }

  // 2) Acknowledgment — em lotes de 2000 (limite iFood)
  const CHUNK = 2000;
  for (let i = 0; i < ackIds.length; i += CHUNK) {
    const chunk = ackIds.slice(i, i + CHUNK).map((id) => ({ id }));
    const ackResp = await fetchWithBackoff(`${IFOOD_BASE}/events/v1.0/events/acknowledgment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!ackResp.ok) {
      console.error(`Ack falhou [${ackResp.status}]: ${await ackResp.text()}`);
    }
  }

  await supabase
    .from("ifood_credentials")
    .update({ last_polling_at: new Date().toISOString() })
    .eq("id", cred.id);

  return { events: processed, total_received: events.length, ack: ackIds.length };
}

async function reprocessPlacedEvents(supabase: any, cred: any) {
  const token = await getIfoodToken(supabase, cred.environment);

  const { data: plcEvents } = await supabase
    .from("ifood_event_log")
    .select("order_external_id")
    .eq("client_id", cred.client_id)
    .in("event_type", ["PLC", "PLACED"])
    .not("order_external_id", "is", null);

  const uniqueIds = Array.from(
    new Set((plcEvents ?? []).map((e: any) => e.order_external_id).filter(Boolean))
  );

  let created = 0;
  for (const orderExternalId of uniqueIds) {
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("client_id", cred.client_id)
      .eq("external_order_id", orderExternalId)
      .maybeSingle();
    if (existing) continue;

    const details = await fetchOrderDetails(token, orderExternalId as string);
    if (!details) continue;
    await upsertOrderFromIfood(supabase, cred.client_id, details);
    created++;
  }

  return created;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const reprocess = url.searchParams.get("reprocess") === "1";

    // Apenas clientes com iFood habilitado (gate `clients.ifood_enabled`)
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

    const { data: creds, error } = await supabase
      .from("ifood_credentials")
      .select("id, client_id, merchant_id, environment, active")
      .eq("active", true)
      .in("client_id", enabledIds);

    if (error) throw error;

    const results: any[] = [];
    for (const cred of creds ?? []) {
      try {
        if (reprocess) {
          const r = await reprocessPlacedEvents(supabase, cred);
          results.push({ client_id: cred.client_id, reprocessed: r });
        } else {
          const r = await processClient(supabase, cred);
          results.push({ client_id: cred.client_id, ...r });
        }
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
