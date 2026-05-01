import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, RefreshCw, Loader2, Truck, Package, ChevronDown, ChevronUp, Calendar, MapPin, CreditCard, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIfoodEnabled } from "@/hooks/useIfoodEnabled";
import { formatBRL } from "@/lib/format";
import { printOrder } from "@/lib/printOrder";
import { AppLayout } from "@/components/AppLayout";

type IfoodOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  total_amount: number;
  status: string;
  ifood_status: string | null;
  approval_status: string | null;
  external_order_id: string | null;
  created_at: string;
  ifood_payload: any;
  ifood_order_type: string | null;
  ifood_order_timing: string | null;
  ifood_pickup_code: string | null;
  ifood_scheduled_for: string | null;
  order_items?: Array<{
    product_name: string;
    quantity: number;
    total_price: number;
    observations: string | null;
    complements: any;
  }>;
};

type CancellationReason = { cancelCodeId: string; description: string };

// ---------- Helpers de exibição ----------
const fmtCpfCnpj = (doc: string) => {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
};

function PaymentInfo({ payload }: { payload: any }) {
  const methods = payload?.payments?.methods ?? payload?.payments ?? [];
  if (!Array.isArray(methods) || methods.length === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      {methods.map((m: any, i: number) => {
        const method = (m.method ?? m.code ?? "").toString().toUpperCase();
        const brand = m.card?.brand ?? m.brand ?? null;
        const isCash = method.includes("CASH") || method === "DINHEIRO";
        const changeFor = isCash ? Number(m.cash?.changeFor ?? m.changeFor ?? 0) : 0;
        const value = Number(m.value ?? m.amount ?? 0);
        const prepaid = m.prepaid === true || m.type === "ONLINE";

        return (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <CreditCard className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">
              {method || "Pagamento"} {brand ? `· ${brand}` : ""} {prepaid ? "(pago online)" : "(na entrega)"}
            </span>
            {value > 0 && <span className="text-muted-foreground">{formatBRL(value)}</span>}
            {isCash && changeFor > 0 && (
              <Badge variant="secondary">Troco para {formatBRL(changeFor)}</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BenefitsInfo({ payload }: { payload: any }) {
  const benefits = payload?.benefits ?? [];
  if (!Array.isArray(benefits) || benefits.length === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      {benefits.map((b: any, i: number) => {
        const value = Number(b.value ?? b.amount ?? 0);
        const sponsorshipValues = b.sponsorshipValues ?? b.sponsorship?.values ?? [];
        const description = b.description ?? b.targetType ?? "Cupom";

        return (
          <div key={i} className="flex flex-col gap-1 p-2 rounded bg-muted/50">
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3 text-green-600" />
              <span className="font-medium">{description}</span>
              <span className="text-green-700 font-semibold">- {formatBRL(value)}</span>
            </div>
            {Array.isArray(sponsorshipValues) && sponsorshipValues.length > 0 && (
              <div className="text-xs text-muted-foreground pl-5">
                {sponsorshipValues.map((s: any, j: number) => (
                  <span key={j} className="mr-3">
                    {s.name ?? s.sponsor ?? "—"}: {formatBRL(Number(s.value ?? 0))}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomerInfo({ payload, pickupCode }: { payload: any; pickupCode: string | null }) {
  const customer = payload?.customer ?? {};
  const doc = customer.documentNumber ?? customer.cpf ?? customer.taxPayerIdentificationNumber;
  const phone = customer.phone?.number ?? customer.phone ?? null;

  return (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <User className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{customer.name ?? "—"}</span>
        {phone && <span className="text-muted-foreground">· {phone}</span>}
      </div>
      {doc && <div className="text-xs text-muted-foreground pl-5">CPF/CNPJ: {fmtCpfCnpj(String(doc))}</div>}
      {pickupCode && (
        <div className="pl-5">
          <Badge variant="outline" className="font-mono">Código de coleta: {pickupCode}</Badge>
        </div>
      )}
    </div>
  );
}

function DeliveryInfo({ payload, orderType }: { payload: any; orderType: string | null }) {
  if (orderType === "TAKEOUT") {
    return (
      <div className="text-sm flex items-center gap-2">
        <Package className="w-3 h-3 text-muted-foreground" /> Retirada no balcão
      </div>
    );
  }
  const addr = payload?.delivery?.deliveryAddress ?? payload?.deliveryAddress ?? null;
  const obs = payload?.delivery?.observations ?? payload?.deliveryObservations ?? null;
  if (!addr && !obs) return null;

  return (
    <div className="space-y-1 text-sm">
      {addr && (
        <div className="flex items-start gap-2">
          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
          <div>
            <div>
              {addr.streetName ?? addr.formattedAddress}
              {addr.streetNumber ? `, ${addr.streetNumber}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {addr.neighborhood ?? ""} {addr.city ? `· ${addr.city}` : ""} {addr.complement ? `· ${addr.complement}` : ""}
            </div>
            {addr.reference && <div className="text-xs text-muted-foreground">Ref: {addr.reference}</div>}
          </div>
        </div>
      )}
      {obs && (
        <div className="text-xs italic text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          <strong>Obs. de entrega:</strong> {obs}
        </div>
      )}
    </div>
  );
}

function ScheduledBadge({ scheduledFor }: { scheduledFor: string | null }) {
  if (!scheduledFor) return null;
  return (
    <Badge variant="outline" className="border-purple-300 text-purple-700">
      <Calendar className="w-3 h-3 mr-1" />
      Agendado: {new Date(scheduledFor).toLocaleString("pt-BR")}
    </Badge>
  );
}

function OrderItemsList({ items }: { items: IfoodOrder["order_items"] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="text-sm space-y-2 border-t pt-2">
      {items.map((it, idx) => (
        <li key={idx}>
          <div className="flex justify-between">
            <span className="font-medium">{it.quantity}× {it.product_name}</span>
            <span>{formatBRL(Number(it.total_price))}</span>
          </div>
          {Array.isArray(it.complements) && it.complements.length > 0 && (
            <ul className="pl-4 text-xs text-muted-foreground">
              {it.complements.map((c: any, j: number) => (
                <li key={j}>+ {c.name ?? c.description}</li>
              ))}
            </ul>
          )}
          {it.observations && (
            <div className="pl-4 text-xs italic text-amber-700">Obs: {it.observations}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------- Componente principal ----------
export default function IfoodOrders() {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { enabled, loading: loadingFlag } = useIfoodEnabled();
  const [orders, setOrders] = useState<IfoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Cancelamento
  const [cancelTarget, setCancelTarget] = useState<IfoodOrder | null>(null);
  const [cancelReasons, setCancelReasons] = useState<CancellationReason[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [loadingReasons, setLoadingReasons] = useState(false);

  const load = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(product_name, quantity, total_price, observations, complements)")
      .eq("client_id", clientId)
      .eq("origin", "ifood")
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders((data ?? []) as IfoodOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!clientId) return;
    const channel = supabase
      .channel("ifood-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `client_id=eq.${clientId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const doAction = async (orderId: string, action: string, extra?: any) => {
    setActing(orderId);
    const { data, error } = await supabase.functions.invoke("ifood-order-action", {
      body: { orderId, action, ...extra },
    });
    setActing(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Erro");
      return false;
    }
    toast.success("Ação executada com sucesso");

    if (action === "confirm") {
      try {
        const { data: full } = await supabase
          .from("orders")
          .select(`
            id, order_number, customer_name, total_amount, payment_method,
            status, created_at, updated_at,
            order_items (
              id, product_name, quantity, unit_price, total_price, complements, observations
            )
          `)
          .eq("id", orderId)
          .maybeSingle();
        if (full) {
          await printOrder({ ...(full as any), items: (full as any).order_items ?? [] });
        }
      } catch (e) {
        console.error("Falha ao imprimir cupom iFood:", e);
        toast.error("Pedido aceito, mas falhou ao imprimir o cupom");
      }
    }
    load();
    return true;
  };

  const openCancelDialog = async (order: IfoodOrder) => {
    setCancelTarget(order);
    setSelectedReason("");
    setCancelReasons([]);
    setLoadingReasons(true);
    const { data, error } = await supabase.functions.invoke("ifood-order-action", {
      body: { orderId: order.id, action: "getCancellationReasons" },
    });
    setLoadingReasons(false);
    if (error || (data as any)?.error) {
      toast.error("Não foi possível carregar motivos de cancelamento. Usando padrão.");
      setCancelReasons([{ cancelCodeId: "501", description: "PROBLEMAS DE SISTEMA" }]);
    } else {
      const reasons = ((data as any)?.reasons ?? []) as any[];
      const normalized = reasons.map((r: any) => ({
        cancelCodeId: String(r.cancelCodeId ?? r.code ?? r.id),
        description: r.description ?? r.reason ?? r.cancelCodeId,
      }));
      setCancelReasons(normalized.length > 0 ? normalized : [{ cancelCodeId: "501", description: "PROBLEMAS DE SISTEMA" }]);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget || !selectedReason) return;
    const reason = cancelReasons.find((r) => r.cancelCodeId === selectedReason);
    const ok = await doAction(cancelTarget.id, "cancel", {
      cancellationCode: selectedReason,
      cancellationReason: reason?.description ?? "Cancelado pelo estabelecimento",
    });
    if (ok) setCancelTarget(null);
  };

  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  if (loadingFlag) {
    return (
      <AppLayout title="Pedidos iFood">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!enabled) {
    return (
      <AppLayout title="Pedidos iFood">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Integração indisponível</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")}>Voltar</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const pendentes = orders.filter((o) => o.approval_status === "pendente");
  const ativos = orders.filter(
    (o) =>
      o.approval_status === "aprovado" &&
      o.status !== "cancelado" &&
      o.ifood_status !== "DISPATCHED" &&
      o.ifood_status !== "CONCLUDED"
  );
  const finalizados = orders.filter(
    (o) => o.ifood_status === "DISPATCHED" || o.ifood_status === "CONCLUDED" || o.status === "finalizado"
  );
  const cancelados = orders.filter(
    (o) => o.approval_status === "rejeitado" || o.status === "cancelado" || o.ifood_status === "CANCELLED"
  );

  const renderRichCard = (o: IfoodOrder, footer: React.ReactNode) => {
    const isExp = !!expanded[o.id];
    return (
      <Card key={o.id} className={o.approval_status === "pendente" ? "border-amber-300" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">
              #{o.order_number} · {o.customer_name}
            </CardTitle>
            <span className="font-bold">{formatBRL(Number(o.total_amount))}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant="outline">{o.ifood_order_type ?? "DELIVERY"}</Badge>
            {o.ifood_order_timing === "SCHEDULED" && (
              <ScheduledBadge scheduledFor={o.ifood_scheduled_for} />
            )}
            <span>iFood {o.external_order_id?.slice(0, 8)}…</span>
            <span>· {new Date(o.created_at).toLocaleTimeString("pt-BR")}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CustomerInfo payload={o.ifood_payload} pickupCode={o.ifood_pickup_code} />
          <DeliveryInfo payload={o.ifood_payload} orderType={o.ifood_order_type} />
          <PaymentInfo payload={o.ifood_payload} />
          <BenefitsInfo payload={o.ifood_payload} />

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => toggleExpand(o.id)}
          >
            {isExp ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {isExp ? "Ocultar itens" : `Ver ${o.order_items?.length ?? 0} itens`}
          </Button>
          {isExp && <OrderItemsList items={o.order_items} />}

          {footer}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout
      title="Pedidos iFood"
      subtitle="Aprove manualmente antes de enviar para a cozinha"
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Aguardando aprovação */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge variant="destructive">{pendentes.length}</Badge>
            Aguardando aprovação
          </h2>
          {pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido aguardando aprovação.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pendentes.map((o) =>
                renderRichCard(
                  o,
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => doAction(o.id, "confirm")}
                      disabled={acting === o.id}
                    >
                      <Check className="w-4 h-4 mr-1" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => openCancelDialog(o)}
                      disabled={acting === o.id}
                    >
                      <X className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Em andamento */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge>{ativos.length}</Badge>
            Em andamento
          </h2>
          {ativos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido em andamento.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {ativos.map((o) =>
                renderRichCard(
                  o,
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Badge variant="outline" className="self-center">{o.ifood_status ?? o.status}</Badge>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => doAction(o.id, "readyToPickup")}
                      disabled={acting === o.id || o.ifood_status === "READY_TO_PICKUP"}
                    >
                      <Package className="w-3 h-3 mr-1" /> Pronto
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => doAction(o.id, "dispatch")}
                      disabled={acting === o.id || o.ifood_status !== "READY_TO_PICKUP"}
                      title={o.ifood_status !== "READY_TO_PICKUP" ? "Marque como Pronto antes de despachar" : ""}
                    >
                      <Truck className="w-3 h-3 mr-1" /> Despachar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openCancelDialog(o)}
                      disabled={acting === o.id}
                    >
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Histórico */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Histórico</h2>
          <Tabs defaultValue="finalizados" className="w-full">
            <TabsList>
              <TabsTrigger value="finalizados">
                Finalizados / Despachados ({finalizados.length})
              </TabsTrigger>
              <TabsTrigger value="cancelados">
                Cancelados ({cancelados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="finalizados" className="space-y-2 mt-3">
              {finalizados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido finalizado.</p>
              ) : (
                finalizados.slice(0, 20).map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 border rounded text-sm">
                    <span>#{o.order_number} · {o.customer_name}</span>
                    <Badge variant="secondary">{o.ifood_status ?? o.status}</Badge>
                    <span>{formatBRL(Number(o.total_amount))}</span>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelados" className="space-y-2 mt-3">
              {cancelados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido cancelado.</p>
              ) : (
                cancelados.slice(0, 20).map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 border rounded text-sm">
                    <span>#{o.order_number} · {o.customer_name}</span>
                    <Badge variant="destructive">{o.ifood_status ?? o.status}</Badge>
                    <span>{formatBRL(Number(o.total_amount))}</span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Modal de cancelamento com motivos dinâmicos do iFood */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido #{cancelTarget?.order_number}</DialogTitle>
            <DialogDescription>
              Selecione o motivo do cancelamento. A lista é fornecida pelo iFood conforme o estado atual do pedido.
            </DialogDescription>
          </DialogHeader>

          {loadingReasons ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {cancelReasons.map((r) => (
                  <SelectItem key={r.cancelCodeId} value={r.cancelCodeId}>
                    {r.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!selectedReason || acting === cancelTarget?.id}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
