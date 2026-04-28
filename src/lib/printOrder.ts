import { Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { printHtmlToSystemPrinter } from "@/lib/systemPrinter";
import { formatBRLNumber } from "@/lib/format";

const paymentMethodLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
};

export const buildOrderHtml = (order: Order, paperWidth: string): string => {
  const items = order.items || [];
  const now = new Date(order.created_at).toLocaleString("pt-BR");
  const is58 = paperWidth === "58mm";
  const pageMm = is58 ? "58mm" : "80mm";
  const bodyMm = is58 ? "54mm" : "66mm";

  const itemsHtml = items
    .map((item) => {
      const complementsHtml =
        item.complements && Array.isArray(item.complements) && item.complements.length > 0
          ? (item.complements as any[])
              .filter((c) => c.name !== "Sem Complemento")
              .map((c: any) => `<div class="sub">+ ${c.name}${c.price > 0 ? ` (R$ ${formatBRLNumber(c.price)})` : ""}</div>`)
              .join("")
          : "";

      const obsHtml = item.observations
        ? `<div class="sub"><strong>OBS:</strong> ${item.observations}</div>`
        : "";

      return `<div class="item">
        <div class="row"><strong>${item.quantity}x ${item.product_name}</strong> <span>R$ ${formatBRLNumber(item.total_price)}</span></div>
        ${complementsHtml}
        ${obsHtml}
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Comanda</title>
<style>
  @page { size: ${pageMm} auto; margin: 0; }
  * { font-weight: 900 !important; box-sizing: border-box; }
  html { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; width: ${bodyMm}; max-width: ${bodyMm}; margin: 0 auto; padding: 3mm 1mm; font-size: 10.5pt; color: #000; font-weight: 900; -webkit-font-smoothing: none; word-wrap: break-word; overflow-wrap: anywhere; text-align: center; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 3mm; font-weight: 900; }
  .center { text-align: center; }
  .left { text-align: left; }
  .line { border-top: 2px dashed #000; margin: 2.5mm 0; }
  .row { display: flex; justify-content: space-between; gap: 2mm; width: 100%; text-align: left; }
  .row > *:first-child { min-width: 0; overflow-wrap: anywhere; }
  .row > *:last-child { flex-shrink: 0; text-align: right; }
  .sub { font-size: 10.5pt; padding-left: 2mm; text-align: left; }
  .item { margin-bottom: 2.5mm; text-align: left; }
  .total { font-size: 12.5pt; }
  strong, b { font-weight: 900; }
</style></head><body>
  <h1>MALUKUS BATATA</h1>
  <div class="center">*** COMANDA DE PRODUÇÃO ***</div>
  <div class="center">${now}</div>
  <div class="line"></div>
  <div class="left"><strong>Pedido:</strong> #${order.order_number}</div>
  <div class="left"><strong>Cliente:</strong> ${order.customer_name.toUpperCase()}</div>
  <div class="left"><strong>Pagamento:</strong> ${paymentMethodLabel[order.payment_method] || order.payment_method.toUpperCase()}</div>
  <div class="line"></div>
  ${itemsHtml}
  <div class="line"></div>
  <div class="row total"><span>TOTAL:</span><span>R$ ${formatBRLNumber(order.total_amount)}</span></div>
  <div class="line"></div>
  <div class="center">Obrigado pela preferência!</div>
</body></html>`;
};

export const printOrder = async (order: Order) => {
  const { data: configs } = await supabase
    .from("printer_config")
    .select("*")
    .limit(1);

  const config = configs && configs.length > 0 ? configs[0] : null;

  if (!config) {
    console.warn("Configuração de impressora não encontrada");
    return;
  }

  const htmlContent = buildOrderHtml(order, config.paper_width || "80mm");

  try {
    await printHtmlToSystemPrinter(config.printer_name || "", htmlContent);
  } catch (error) {
    console.error("Erro ao imprimir pedido:", error);
  }
};
