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
  const paperWidthMm = paperWidth === "58mm" ? "58mm" : "80mm";
  const paperWidthPx = paperWidth === "58mm" ? "164px" : "226px";

  const itemsHtml = items
    .map((item) => {
      const complementsHtml =
        item.complements && Array.isArray(item.complements) && item.complements.length > 0
          ? (item.complements as any[])
              .filter((c) => c.name !== "Sem Complemento")
              .map((c: any) => `<div class="sub">+ ${c.name}${c.price > 0 ? ` (R$ ${Number(c.price).toFixed(2).replace(".", ",")})` : ""}</div>`)
              .join("")
          : "";

      const obsHtml = item.observations
        ? `<div class="obs">OBS: ${item.observations}</div>`
        : "";

      return `<div class="item">
        <div class="name">${item.quantity}x ${item.product_name} - R$ ${item.total_price.toFixed(2).replace(".", ",")}</div>
        ${complementsHtml}
        ${obsHtml}
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidthMm} auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; color: #000; width: ${paperWidthPx}; font-size: 17px; font-weight: 700; }
    .receipt { width: 100%; }
    .center { text-align: center; }
    .title { font-size: 20px; font-weight: 700; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .item { margin-bottom: 6px; }
    .name { font-weight: 700; font-size: 17px; }
    .sub { font-size: 15px; margin-left: 8px; }
    .obs { font-size: 15px; margin-left: 8px; font-weight: 700; }
    .total { font-weight: 700; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="title">PASTEL FAVORITE</div>
      <div>Comanda de Produção</div>
    </div>
    <div class="divider"></div>
    <div><strong>Pedido:</strong> #${order.order_number}</div>
    <div><strong>Cliente:</strong> ${order.customer_name.toUpperCase()}</div>
    <div><strong>Data/Hora:</strong> ${now}</div>
    <div class="divider"></div>
    <div><strong>ITENS:</strong></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div class="total">TOTAL: R$ ${order.total_amount.toFixed(2).replace(".", ",")}</div>
    <div>Pagamento: ${paymentMethodLabel[order.payment_method] || order.payment_method.toUpperCase()}</div>
    <div class="center" style="margin-top: 8px;">Obrigado pela preferência!</div>
  </div>
</body>
</html>`;
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
