// 99Food Webhook receiver — recebe eventos de pedidos da 99Food/DiDi Food
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-99food-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // 99Food normalmente faz GET de verificação ao cadastrar webhook
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge") ?? url.searchParams.get("echostr");
    if (challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ ok: true, service: "99food-webhook" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Loga o evento bruto pra inspeção (mesma estratégia do iFood)
    await admin.from("ifood_event_log").insert({
      client_id: null,
      event_id: payload?.id ?? payload?.eventId ?? crypto.randomUUID(),
      event_type: `99food:${payload?.type ?? payload?.eventType ?? "unknown"}`,
      order_external_id: payload?.orderId ?? payload?.order_id ?? null,
      payload,
      processed: false,
    });

    console.log("[99food-webhook] evento recebido:", JSON.stringify(payload).slice(0, 500));

    // Responde 200 rapidamente — processamento real virá depois
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[99food-webhook] erro:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
