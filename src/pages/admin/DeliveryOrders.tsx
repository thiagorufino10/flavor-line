import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bike, Printer, CheckCircle2, Clock, Phone, MapPin, Volume2, VolumeX, Truck, MessageCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/format";

interface DeliveryItem {
  name: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sauces: string[];
}

interface DeliveryOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_type: string;
  neighborhood_name: string | null;
  address_detail: string | null;
  payment_method: string;
  notes: string | null;
  items: DeliveryItem[];
  products_total: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
  printed: boolean;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-orange-500" },
  preparando: { label: "Em Preparação", color: "bg-blue-500" },
  pronto: { label: "Pronto", color: "bg-green-500" },
  saiu_entrega: { label: "Saiu para entrega", color: "bg-purple-500" },
  entregue: { label: "Entregue", color: "bg-zinc-500" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
};

const ACTIVE_STATUSES = ["novo", "preparando", "pronto", "saiu_entrega"];

// Normaliza telefone para formato internacional (BR padrão)
const normalizePhone = (phone: string): string => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
};

const openWhatsApp = (phone: string, message: string) => {
  const num = normalizePhone(phone);
  if (!num) {
    toast.error("Telefone do cliente inválido");
    return;
  }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.55);
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.value = 1175;
      g2.gain.setValueAtTime(0.0001, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start();
      o2.stop(ctx.currentTime + 0.55);
    }, 250);
  } catch (e) {
    console.warn("Audio not available", e);
  }
};

const printOrder = (order: DeliveryOrder) => {
  const data = new Date(order.created_at).toLocaleString("pt-BR");
  const itemsHtml = order.items
    .map(
      (i) => `
      <div class="item">
        <div class="row"><strong>${i.quantity}x ${i.name}</strong> <span>${formatBRL(i.total_price)}</span></div>
        <div class="sub">Tamanho: ${i.size}</div>
        ${i.sauces?.length ? `<div class="sub">Molhos: ${i.sauces.join(", ")}</div>` : ""}
      </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pedido Delivery</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 6mm 4mm; font-size: 12pt; color: #000; }
  h1 { font-size: 16pt; text-align: center; margin: 0 0 4mm; }
  .center { text-align: center; }
  .line { border-top: 1px dashed #000; margin: 3mm 0; }
  .row { display: flex; justify-content: space-between; gap: 4mm; }
  .sub { font-size: 10pt; padding-left: 4mm; }
  .item { margin-bottom: 3mm; }
  .total { font-size: 14pt; font-weight: bold; }
</style></head><body>
  <h1>*** PEDIDO DELIVERY ***</h1>
  <div class="center">${data}</div>
  <div class="line"></div>
  <div><strong>Cliente:</strong> ${order.customer_name}</div>
  <div><strong>Telefone:</strong> ${order.customer_phone}</div>
  <div><strong>Tipo:</strong> ${order.service_type === "delivery" ? "DELIVERY" : "RETIRADA"}</div>
  ${order.service_type === "delivery" ? `
    <div><strong>Bairro:</strong> ${order.neighborhood_name ?? ""}</div>
    <div><strong>Endereço:</strong> ${order.address_detail ?? ""}</div>
  ` : ""}
  <div><strong>Pagamento:</strong> ${order.payment_method}</div>
  <div class="line"></div>
  ${itemsHtml}
  <div class="line"></div>
  <div class="row"><span>Produtos:</span><span>${formatBRL(order.products_total)}</span></div>
  <div class="row"><span>Entrega:</span><span>${formatBRL(order.delivery_fee)}</span></div>
  <div class="row total"><span>TOTAL:</span><span>${formatBRL(order.total_amount)}</span></div>
  ${order.notes ? `<div class="line"></div><div><strong>Obs:</strong> ${order.notes}</div>` : ""}
  <div class="line"></div>
  <div class="center">--- Pedido recebido pela loja online ---</div>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);};</script>
</body></html>`;

  const w = window.open("", "_blank", "width=400,height=600");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

const DeliveryOrdersPage = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [filter, setFilter] = useState<"ativos" | "entregues">("ativos");
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const load = async () => {
    // Carrega ativos + entregues/cancelados das últimas 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*")
      .or(`status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte.${since}`)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar pedidos");
      console.error(error);
    } else {
      const list = (data as any[]) || [];
      setOrders(list);
      list.forEach((o) => seenIds.current.add(o.id));
    }
    setLoading(false);
    initialized.current = true;
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("delivery-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_orders" },
        (payload) => {
          const newOrder = payload.new as DeliveryOrder;
          if (seenIds.current.has(newOrder.id)) return;
          seenIds.current.add(newOrder.id);
          setOrders((prev) => [newOrder, ...prev]);
          if (initialized.current) {
            if (soundOn) playBeep();
            toast.success(`🛵 Novo pedido de ${newOrder.customer_name}!`, {
              duration: 8000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_orders" },
        (payload) => {
          const updated = payload.new as DeliveryOrder;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  const updateStatus = async (id: string, status: string, extra: any = {}) => {
    const { error } = await supabase
      .from("delivery_orders")
      .update({ status, ...extra })
      .eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else toast.success("Atualizado");
  };

  const markReady = (order: DeliveryOrder) => {
    updateStatus(order.id, "pronto");
    const msg =
      order.service_type === "delivery"
        ? `Olá ${order.customer_name}! 🎉\n\nSeu pedido está *PRONTO* e em breve sairá para entrega.\n\nObrigado pela preferência! 🍴`
        : `Olá ${order.customer_name}! 🎉\n\nSeu pedido está *PRONTO* para retirada.\n\nObrigado pela preferência! 🍴`;
    openWhatsApp(order.customer_phone, msg);
  };

  const markOut = (order: DeliveryOrder) => {
    updateStatus(order.id, "saiu_entrega");
    const msg = `Olá ${order.customer_name}! 🛵\n\nSeu pedido *SAIU PARA ENTREGA* e logo chegará até você.\n\nObrigado pela preferência! 🍴`;
    openWhatsApp(order.customer_phone, msg);
  };

  const handlePrint = async (order: DeliveryOrder) => {
    printOrder(order);
    await supabase.from("delivery_orders").update({ printed: true }).eq("id", order.id);
  };

  const filteredOrders = orders.filter((o) =>
    filter === "ativos" ? ACTIVE_STATUSES.includes(o.status) : ["entregue", "cancelado"].includes(o.status),
  );
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const doneCount = orders.filter((o) => ["entregue", "cancelado"].includes(o.status)).length;

  return (
    <AppLayout
      title="Delivery"
      subtitle="Pedidos da loja online em tempo real"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSoundOn((v) => !v)}
          title={soundOn ? "Som ligado" : "Som desligado"}
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      }
    >
      <div className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "ativos" | "entregues")}>
          <TabsList>
            <TabsTrigger value="ativos">Ativos ({activeCount})</TabsTrigger>
            <TabsTrigger value="entregues">Entregues ({doneCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bike className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {filter === "ativos"
                  ? "Nenhum pedido ativo no momento. Quando um cliente fizer um pedido pela loja online, ele aparecerá aqui automaticamente."
                  : "Nenhum pedido entregue ainda."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map((order) => {
              const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.novo;
              const isNew = order.status === "novo";
              return (
                <Card
                  key={order.id}
                  className={`${isNew ? "border-orange-500 border-2 shadow-lg shadow-orange-500/20 animate-pulse-slow" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bike className="w-5 h-5 text-primary" />
                          {order.customer_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{order.customer_phone}</span>
                    </div>
                    {order.service_type === "delivery" ? (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          <strong>{order.neighborhood_name}</strong> — {order.address_detail}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline">Retirada no local</Badge>
                    )}

                    <div className="border-t pt-2 space-y-1">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="flex justify-between">
                            <span>
                              <strong>{i.quantity}x</strong> {i.name} ({i.size})
                            </span>
                            <span className="font-medium">{formatBRL(i.total_price)}</span>
                          </div>
                          {i.sauces?.length > 0 && (
                            <div className="text-xs text-muted-foreground pl-4">
                              Molhos: {i.sauces.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded p-2 text-xs">
                        <strong>Obs:</strong> {order.notes}
                      </div>
                    )}

                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Produtos</span>
                        <span>{formatBRL(order.products_total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Entrega</span>
                        <span>{formatBRL(order.delivery_fee)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span className="text-primary">{formatBRL(order.total_amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pagamento: <strong>{order.payment_method}</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" onClick={() => handlePrint(order)}>
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openWhatsApp(order.customer_phone, `Olá ${order.customer_name}!`)}
                        title="Abrir conversa no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        WhatsApp
                      </Button>
                      {order.status === "novo" && (
                        <Button size="sm" onClick={() => updateStatus(order.id, "preparando")}>
                          Aceitar
                        </Button>
                      )}
                      {order.status === "preparando" && (
                        <Button size="sm" onClick={() => markReady(order)}>
                          Marcar pronto
                        </Button>
                      )}
                      {order.status === "pronto" && order.service_type === "delivery" && (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => markOut(order)}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          Saiu para entrega
                        </Button>
                      )}
                      {(order.status === "saiu_entrega" ||
                        (order.status === "pronto" && order.service_type !== "delivery")) && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatus(order.id, "entregue")}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {order.service_type === "delivery" ? "Entregue" : "Retirado"}
                        </Button>
                      )}
                      {!["entregue", "cancelado"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive ml-auto"
                          onClick={() => {
                            if (confirm("Cancelar este pedido?")) updateStatus(order.id, "cancelado");
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DeliveryOrdersPage;
