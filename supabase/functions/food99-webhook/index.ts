// 99Food Webhook receiver — recebe eventos da 99Food/DiDi Food e cria pedidos
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-99food-signature",
};

// Formato de ACK aceito pela DiDi/99Food: code numérico 0 + msg/message "success" + success:true
const ackOk = (extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      code: 0,
      msg: "success",
      message: "success",
      success: true,
      ...extra,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verificação inicial do webhook (challenge / echostr)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge") ?? url.searchParams.get("echostr");
    if (challenge) return new Response(challenge, { status: 200, headers: corsHeaders });
    return new Response(JSON.stringify({ ok: true, service: "99food-webhook" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const raw = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }

    const eventType: string = String(
      payload?.type ?? payload?.eventType ?? "unknown"
    );
    const data = payload?.data ?? payload;

    console.log(`[99food-webhook] RAW payload:`, raw);

    // Tenta resolver merchant pelo shop id (vários nomes possíveis usados pela DiDi)
    const shopId: string | null =
      payload?.app_shop_id ??
      data?.app_shop_id ??
      data?.appShopID ??
      data?.shopId ??
      data?.merchantId ??
      data?.appShopIDList?.[0] ??
      payload?.appShopID ??
      null;

    let clientId: string | null = null;
    if (shopId) {
      const { data: cred } = await admin
        .from("food99_credentials")
        .select("client_id")
        .eq("merchant_id", String(shopId))
        .maybeSingle();
      clientId = cred?.client_id ?? null;
    }

    // Fallback: se não achou, pega o único cliente com 99food habilitado (modo homologação)
    if (!clientId) {
      const { data: enabled } = await admin
        .from("clients")
        .select("id")
        .eq("food99_enabled", true)
        .limit(2);
      if (enabled && enabled.length === 1) clientId = enabled[0].id;
    }

    // Loga o evento sempre
    await admin.from("ifood_event_log").insert({
      client_id: clientId,
      event_id: payload?.id ?? payload?.eventId ?? crypto.randomUUID(),
      event_type: `99food:${eventType}`,
      order_external_id:
        data?.orderId ?? data?.order_id ?? data?.appOrderID ?? null,
      payload,
      processed: false,
    });

    console.log(
      `[99food-webhook] type=${eventType} shopId=${shopId} clientId=${clientId}`
    );

    // Se for evento de criação de pedido, cria no banco
    const isOrderCreate =
      /order/i.test(eventType) &&
      (/create|new|received/i.test(eventType) || eventType === "orderCreate");

    if (isOrderCreate && clientId) {
      const externalId =
        data?.orderId ?? data?.order_id ?? data?.appOrderID ?? crypto.randomUUID();

      // Evita duplicar
      const { data: existing } = await admin
        .from("orders")
        .select("id")
        .eq("client_id", clientId)
        .eq("origin", "99food")
        .eq("external_order_id", String(externalId))
        .maybeSingle();

      if (!existing) {
        const customerName =
          data?.customer?.name ??
          data?.customerName ??
          data?.userName ??
          "Cliente 99Food";

        // Itens podem vir em vários formatos — tentamos os comuns
        const rawItems: any[] =
          data?.items ?? data?.orderItems ?? data?.products ?? [];

        let itemsToInsert: any[] = [];
        let total = Number(data?.totalAmount ?? data?.total ?? 0);

        if (Array.isArray(rawItems) && rawItems.length > 0) {
          itemsToInsert = rawItems.map((it: any) => {
            const qty = Number(it?.quantity ?? it?.qty ?? 1);
            const unit = Number(it?.price ?? it?.unitPrice ?? it?.amount ?? 0);
            return {
              product_name:
                it?.name ?? it?.itemName ?? it?.productName ?? "Item 99Food",
              quantity: qty,
              unit_price: unit,
              total_price: unit * qty,
              observations: it?.note ?? it?.notes ?? null,
            };
          });
          if (!total) {
            total = itemsToInsert.reduce(
              (s, i) => s + Number(i.total_price || 0),
              0
            );
          }
        } else {
          // Sandbox sem item real — cria placeholder
          itemsToInsert = [
            {
              product_name: "Item 99Food (sandbox)",
              quantity: 1,
              unit_price: total || 0,
              total_price: total || 0,
              observations: `appItemId: ${data?.appItemID ?? data?.appItemId ?? "n/d"}`,
            },
          ];
          if (!total) total = 0;
        }

        const { data: order, error: orderErr } = await admin
          .from("orders")
          .insert({
            client_id: clientId,
            origin: "99food",
            external_order_id: String(externalId),
            customer_name: customerName,
            status: "novo",
            payment_method: data?.paymentMethod ?? "99food",
            total_amount: total,
            ifood_payload: payload,
          })
          .select("id")
          .single();

        if (orderErr) {
          console.error("[99food-webhook] erro criando pedido:", orderErr);
        } else if (order) {
          await admin.from("order_items").insert(
            itemsToInsert.map((i) => ({
              ...i,
              order_id: order.id,
              client_id: clientId,
            }))
          );
          console.log(
            `[99food-webhook] pedido criado id=${order.id} external=${externalId} total=${total}`
          );
        }
      }
    }

    return ackOk();
  } catch (e) {
    console.error("[99food-webhook] erro:", e);
    // Devolvemos 200 mesmo em erro para o sandbox não retentar infinitamente
    return new Response(
      JSON.stringify({ code: 1, msg: String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
