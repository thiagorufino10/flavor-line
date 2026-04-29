import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, RefreshCw, Loader2, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIfoodEnabled } from "@/hooks/useIfoodEnabled";
import { formatBRL } from "@/lib/format";
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
  order_items?: Array<{
    product_name: string;
    quantity: number;
    total_price: number;
  }>;
};

export default function IfoodOrders() {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { enabled, loading: loadingFlag } = useIfoodEnabled();
  const [orders, setOrders] = useState<IfoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(product_name, quantity, total_price)")
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
    } else {
      toast.success("Ação executada com sucesso");
      load();
    }
  };

  if (loadingFlag) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Integração indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendentes = orders.filter((o) => o.approval_status === "pendente");
  const ativos = orders.filter((o) => o.approval_status === "aprovado" && o.status !== "cancelado");
  const finalizados = orders.filter(
    (o) => o.approval_status === "rejeitado" || o.status === "cancelado" || o.ifood_status === "DISPATCHED"
  );

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pedidos iFood</h1>
            <p className="text-sm text-muted-foreground">
              Aprove manualmente antes de enviar para a cozinha
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

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
            {pendentes.map((o) => (
              <Card key={o.id} className="border-amber-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      #{o.order_number} · {o.customer_name}
                    </CardTitle>
                    <span className="font-bold">{formatBRL(Number(o.total_amount))}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    iFood ID: {o.external_order_id?.slice(0, 8)}… · {new Date(o.created_at).toLocaleTimeString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm space-y-1">
                    {(o.order_items ?? []).map((it, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{it.quantity}× {it.product_name}</span>
                        <span>{formatBRL(Number(it.total_price))}</span>
                      </li>
                    ))}
                  </ul>
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
                      onClick={() =>
                        doAction(o.id, "cancel", {
                          cancellationReason: "Estabelecimento não pode atender",
                          cancellationCode: "501",
                        })
                      }
                      disabled={acting === o.id}
                    >
                      <X className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
          <div className="grid gap-3 md:grid-cols-3">
            {ativos.map((o) => (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>#{o.order_number} · {o.customer_name}</span>
                    <Badge variant="outline">{o.ifood_status ?? o.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm font-bold">{formatBRL(Number(o.total_amount))}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => doAction(o.id, "readyToPickup")}
                      disabled={acting === o.id || o.ifood_status === "READY_TO_PICKUP"}
                    >
                      <Package className="w-3 h-3 mr-1" /> Pronto
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => doAction(o.id, "dispatch")}
                      disabled={acting === o.id}
                    >
                      <Truck className="w-3 h-3 mr-1" /> Despachar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Finalizados/cancelados */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
          Finalizados / Cancelados ({finalizados.length})
        </h2>
        <div className="space-y-2">
          {finalizados.slice(0, 10).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-3 border rounded text-sm">
              <span>#{o.order_number} · {o.customer_name}</span>
              <Badge variant="secondary">{o.ifood_status ?? o.status}</Badge>
              <span>{formatBRL(Number(o.total_amount))}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
