import { Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";

export const formatOrderForPrint = (order: Order): string => {
  const items = order.items || [];
  
  let receipt = `
========================================
           PASTEL FAVORITE
========================================

PEDIDO #${order.order_number}
CLIENTE: ${order.customer_name.toUpperCase()}
DATA: ${new Date(order.created_at).toLocaleString('pt-BR')}

----------------------------------------
ITENS DO PEDIDO:
----------------------------------------
`;

  items.forEach((item) => {
    receipt += `\n${item.quantity}x ${item.product_name}`;
    receipt += `\n    R$ ${item.unit_price.toFixed(2)} x ${item.quantity} = R$ ${item.total_price.toFixed(2)}`;
    
    if (item.complements && Array.isArray(item.complements) && item.complements.length > 0) {
      receipt += `\n    Complementos: ${item.complements.map((c: any) => c.name).join(', ')}`;
    }
    
    if (item.observations) {
      receipt += `\n    OBS: ${item.observations}`;
    }
    receipt += '\n';
  });

  receipt += `
----------------------------------------
TOTAL: R$ ${order.total_amount.toFixed(2)}
PAGAMENTO: ${order.payment_method.toUpperCase()}
----------------------------------------

     Obrigado pela preferência!
     
========================================
`;

  return receipt;
};

export const printOrder = (order: Order) => {
  const printerConfig = localStorage.getItem("printerConfig");
  const config = printerConfig ? JSON.parse(printerConfig) : null;
  
  if (!config) {
    console.warn("Configuração de impressora não encontrada");
    return;
  }

  const receiptContent = formatOrderForPrint(order);
  
  // Criar janela de impressão
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${order.order_number}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              font-weight: 700;
              margin: 0;
              padding: 10px;
              width: 280px;
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <pre>${receiptContent}</pre>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Pequeno delay para garantir que o conteúdo foi carregado
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
};
