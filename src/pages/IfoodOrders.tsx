import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, X, RefreshCw, Loader2, Truck, Package, ChevronDown, ChevronUp,
  Calendar, MapPin, CreditCard, Tag, User, Clock, AlertTriangle, Printer, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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

// SLA da homologação iFood: confirmar pedido em até 10 min
const SLA_CONFIRM_MINUTES = 10;

// ---------- Helpers ----------
const fmtCpfCnpj = (doc: string) => {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
};

const minutesSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

function SlaBadge({ createdAt, status }: { createdAt: string; status: string | null }) {
  // Só faz sentido enquanto está pendente
  if (status !== "pendente") return null;
  const mins = minutesSince(createdAt);
  const remaining = SLA_CONFIRM_MINUTES - mins;
  const danger = remaining <= 2;
  const warn = remaining <= 5;
  return (
    <Badge
      variant={danger ? "destructive" : warn ? "secondary" : "outline"}
      className="gap-1"
      title="SLA iFood: confirmar em até 10 min"
    >
      <Clock className="w-3 h-3" />
      {remaining > 0 ? `SLA ${remaining}min` : `Atrasado ${Math.abs(remaining)}min`}
    </Badge>
  );
}

function PaymentInfo({ payload }: { payload: any }) {
  const methods = payload?.payments?.methods ?? payload?.payments ?? [];
  const prepaidTotal = Number(payload?.payments?.prepaid ?? 0);
  const pendingTotal = Number(payload?.payments?.pending ?? 0);
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
        const wallet = m.wallet?.name ?? null;

        return (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <CreditCard className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">
              {method || "Pagamento"} {brand ? `· ${brand}` : ""}{wallet ? ` · ${wallet}` : ""} {prepaid ? "(pago online)" : "(na entrega)"}
            </span>
            {value > 0 && <span className="text-muted-foreground">{formatBRL(value)}</span>}
            {isCash && changeFor > 0 && (
              <Badge variant="secondary">Troco para {formatBRL(changeFor)} (devolver {formatBRL(Math.max(0, changeFor - value))})</Badge>
            )}
          </div>
        );
      })}
      {(prepaidTotal > 0 || pendingTotal > 0) && (
        <div className="text-xs text-muted-foreground pl-5">
          {prepaidTotal > 0 && <span className="mr-3">Pago online: {formatBRL(prepaidTotal)}</span>}
          {pendingTotal > 0 && <span>A receber: {formatBRL(pendingTotal)}</span>}
        </div>
      )}
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
                <strong>Quem paga:</strong>{" "}
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

function TotalsBreakdown({ payload, totalAmount }: { payload: any; totalAmount: number }) {
  const total = payload?.total ?? {};
  const subTotal = Number(total.subTotal ?? payload?.subTotal ?? 0);
  const deliveryFee = Number(total.deliveryFee ?? payload?.deliveryFee ?? 0);
  const additionalFees = Number(total.additionalFees ?? 0);
  const benefits = Number(total.benefits ?? 0);
  const orderAmount = Number(total.orderAmount ?? totalAmount ?? 0);

  if (!subTotal && !deliveryFee && !benefits) {
    return (
      <div className="flex justify-between font-bold border-t pt-2">
        <span>Total</span><span>{formatBRL(orderAmount || totalAmount)}</span>
      </div>
    );
  }
  return (
    <div className="text-sm border-t pt-2 space-y-1">
      {subTotal > 0 && <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subTotal)}</span></div>}
      {deliveryFee > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span>{formatBRL(deliveryFee)}</span></div>}
      {additionalFees > 0 && <div className="flex justify-between"><span>Taxas adicionais</span><span>{formatBRL(additionalFees)}</span></div>}
      {benefits > 0 && <div className="flex justify-between text-green-700"><span>Descontos / cupons</span><span>- {formatBRL(benefits)}</span></div>}
      <div className="flex justify-between font-bold pt-1"><span>Total</span><span>{formatBRL(orderAmount)}</span></div>
    </div>
  );
}

function CustomerInfo({ payload, pickupCode }: { payload: any; pickupCode: string | null }) {
  const customer = payload?.customer ?? {};
  const doc = customer.documentNumber ?? customer.cpf ?? customer.taxPayerIdentificationNumber;
  const phone = customer.phone?.number ?? customer.phone ?? null;
  const localizer = customer.phone?.localizer ?? null;
  const ordersCount = customer.ordersCountOnMerchant ?? null;

  return (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <User className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{customer.name ?? "—"}</span>
        {phone && <span className="text-muted-foreground">· {phone}</span>}
        {localizer && <Badge variant="outline" className="text-[10px]">cód. {localizer}</Badge>}
        {ordersCount !== null && (
          <Badge variant="secondary" className="text-[10px]">{ordersCount}º pedido</Badge>
        )}
      </div>
      {doc && <div className="text-xs text-muted-foreground pl-5">CPF/CNPJ: {fmtCpfCnpj(String(doc))}</div>}
      {pickupCode && (
        <div className="pl-5">
          <Badge variant="outline" className="font-mono text-base">Código de coleta: {pickupCode}</Badge>
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
  if (orderType === "INDOOR") {
    return (
      <div className="text-sm flex items-center gap-2">
        <Package className="w-3 h-3 text-muted-foreground" /> Consumo no local
      </div>
    );
  }
  const addr = payload?.delivery?.deliveryAddress ?? payload?.deliveryAddress ?? null;
  const obs = payload?.delivery?.observations ?? payload?.deliveryObservations ?? null;
  const deliveredBy = payload?.delivery?.deliveredBy ?? null; // MERCHANT | IFOOD
  if (!addr && !obs) return null;

  return (
    <div className="space-y-1 text-sm">
      {deliveredBy && (
        <Badge variant="outline" className="text-[10px]">
          Entrega: {deliveredBy === "IFOOD" ? "Logística iFood" : "Loja"}
        </Badge>
      )}
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
            {addr.postalCode && <div className="text-xs text-muted-foreground">CEP: {addr.postalCode}</div>}
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
  const [showTechnical, setShowTechnical] = useState<IfoodOrder | null>(null);
  const [tick, setTick] = useState(0); // re-render para atualizar SLA

  // Cancelamento
  const [cancelTarget, setCancelTarget] = useState<IfoodOrder | null>(null);
  const [cancelReasons, setCancelReasons] = useState<CancellationReason[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [loadingReasons, setLoadingReasons] = useState(false);

  // Atualiza SLA a cada 30s
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

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

  const reprintOrder = async (orderId: string) => {
    try {
      const { data: full } = await supabase
        .from("orders")
        .select(`
          id, order_number, customer_name, total_amount, payment_method,
          status, created_at, updated_at,
          ifood_payload, ifood_order_type, ifood_pickup_code,
          order_items (id, product_name, quantity, unit_price, total_price, complements, observations)
        `)
        .eq("id", orderId)
        .maybeSingle();
      if (full) {
        await printOrder({ ...(full as any), items: (full as any).order_items ?? [] });
        toast.success("Comanda reenviada à impressora");
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao imprimir");
    }
  };

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
      await reprintOrder(orderId);
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

  // Alerta global se houver pedidos perto de violar SLA (hook ANTES dos early returns)
  const slaAlerts = useMemo(() => {
    void tick;
    return pendentes.filter((p) => SLA_CONFIRM_MINUTES - minutesSince(p.created_at) <= 5);
  }, [pendentes, tick]);

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

  const renderRichCard = (o: IfoodOrder, footer: React.ReactNode) => {
    const isExp = !!expanded[o.id];
    return (
      <Card
        key={o.id}
        className={
          o.approval_status === "pendente"
            ? SLA_CONFIRM_MINUTES - minutesSince(o.created_at) <= 2
              ? "border-destructive border-2"
              : "border-amber-300"
            : ""
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              #{o.order_number} · {o.customer_name}
            </CardTitle>
            <span className="font-bold">{formatBRL(Number(o.total_amount))}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant="outline">{o.ifood_order_type ?? "DELIVERY"}</Badge>
            {o.ifood_order_timing === "SCHEDULED" && (
              <ScheduledBadge scheduledFor={o.ifood_scheduled_for} />
            )}
            <SlaBadge createdAt={o.created_at} status={o.approval_status} />
            <span>iFood {o.external_order_id?.slice(0, 8)}…</span>
            <span>· {new Date(o.created_at).toLocaleTimeString("pt-BR")}</span>
            <button
              type="button"
              onClick={() => setShowTechnical(o)}
              className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
              title="Ver dados técnicos do pedido (auditoria)"
            >
              <Info className="w-3 h-3" /> Detalhes
            </button>
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
          {isExp && (
            <>
              <OrderItemsList items={o.order_items} />
              <TotalsBreakdown payload={o.ifood_payload} totalAmount={o.total_amount} />
            </>
          )}

          {footer}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout
      title="Pedidos iFood"
      subtitle="Aprovação manual · SLA 10 min para confirmação"
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {slaAlerts.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-md border-2 border-destructive bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-destructive">Atenção — SLA crítico:</strong>{" "}
              {slaAlerts.length} pedido(s) prestes a violar o SLA de confirmação iFood (10 min).
              Aceite ou rejeite agora para evitar cancelamento automático.
            </div>
          </div>
        )}

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
                      variant="ghost"
                      onClick={() => reprintOrder(o.id)}
                      title="Reimprimir comanda"
                    >
                      <Printer className="w-3 h-3" />
                    </Button>
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
                  <div key={o.id} className="flex items-center justify-between gap-2 p-3 border rounded text-sm">
                    <span className="flex-1">#{o.order_number} · {o.customer_name}</span>
                    <Badge variant="outline" className="text-[10px]">{o.ifood_order_type ?? "DELIVERY"}</Badge>
                    <Badge variant="secondary">{o.ifood_status ?? o.status}</Badge>
                    <span>{formatBRL(Number(o.total_amount))}</span>
                    <Button size="sm" variant="ghost" onClick={() => reprintOrder(o.id)} title="Reimprimir">
                      <Printer className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowTechnical(o)} title="Ver detalhes">
                      <Info className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelados" className="space-y-2 mt-3">
              {cancelados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido cancelado.</p>
              ) : (
                cancelados.slice(0, 20).map((o) => {
                  const reason =
                    o.ifood_payload?.cancellation?.reason ??
                    o.ifood_payload?.cancellationReason ??
                    null;
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-2 p-3 border rounded text-sm">
                      <div className="flex-1">
                        <div>#{o.order_number} · {o.customer_name}</div>
                        {reason && <div className="text-xs text-muted-foreground">Motivo: {reason}</div>}
                      </div>
                      <Badge variant="destructive">{o.ifood_status ?? o.status}</Badge>
                      <span>{formatBRL(Number(o.total_amount))}</span>
                      <Button size="sm" variant="ghost" onClick={() => setShowTechnical(o)}>
                        <Info className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })
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

      {/* Modal de detalhes técnicos (auditoria homologação) */}
      <Dialog open={!!showTechnical} onOpenChange={(o) => !o && setShowTechnical(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes técnicos do pedido</DialogTitle>
            <DialogDescription>
              Dados brutos retornados pelo iFood. Útil para auditoria e homologação.
            </DialogDescription>
          </DialogHeader>
          {showTechnical && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Order ID iFood:</strong></div><div className="font-mono text-xs break-all">{showTechnical.external_order_id}</div>
                <div><strong>Order ID interno:</strong></div><div className="font-mono text-xs break-all">{showTechnical.id}</div>
                <div><strong>Tipo:</strong></div><div>{showTechnical.ifood_order_type ?? "—"}</div>
                <div><strong>Timing:</strong></div><div>{showTechnical.ifood_order_timing ?? "—"}</div>
                <div><strong>Status iFood:</strong></div><div>{showTechnical.ifood_status ?? "—"}</div>
                <div><strong>Status interno:</strong></div><div>{showTechnical.status}</div>
                <div><strong>Aprovação:</strong></div><div>{showTechnical.approval_status ?? "—"}</div>
                <div><strong>Recebido em:</strong></div><div>{new Date(showTechnical.created_at).toLocaleString("pt-BR")}</div>
                {showTechnical.ifood_pickup_code && (<>
                  <div><strong>Cód. coleta:</strong></div><div className="font-mono">{showTechnical.ifood_pickup_code}</div>
                </>)}
              </div>
              <div>
                <strong className="text-xs">Payload iFood (JSON):</strong>
                <pre className="mt-1 text-[10px] bg-muted p-2 rounded max-h-72 overflow-auto whitespace-pre-wrap break-all">
{JSON.stringify(showTechnical.ifood_payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTechnical(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
