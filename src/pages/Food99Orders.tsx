import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFood99Enabled } from "@/hooks/useFood99Enabled";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export default function Food99Orders() {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { enabled, loading: loadingFlag } = useFood99Enabled();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, total_amount, status, created_at")
      .eq("client_id", clientId)
      .eq("origin", "99food")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [clientId]);

  if (loadingFlag) {
    return (
      <AppLayout title="Pedidos 99Food">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!enabled) {
    return (
      <AppLayout title="Pedidos 99Food">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Indisponível</CardTitle>
            <CardDescription>
              A integração 99Food não está habilitada para este cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Pedidos 99Food"
      subtitle="Pedidos recebidos via integração com a 99Food"
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground space-y-3">
            <Inbox className="w-12 h-12 mx-auto opacity-40" />
            <div className="text-sm">
              Nenhum pedido do 99Food ainda.
              <br />
              Os pedidos aparecerão aqui assim que o webhook for ativado no portal 99Food.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    #{o.order_number} · {o.customer_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{o.status}</Badge>
                  <div className="font-semibold">
                    R$ {o.total_amount.toFixed(2).replace(".", ",")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
