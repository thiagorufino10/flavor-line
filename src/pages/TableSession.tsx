import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, Send, DollarSign, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { MenuPicker, AddedItem } from "@/components/MenuPicker";
import { SessionPaymentModal } from "@/components/SessionPaymentModal";
import { formatBRL } from "@/lib/format";
import { Complement } from "@/components/ComplementsModal";
import { closeTableSession } from "@/hooks/useTables";

interface SessionInfo {
  id: string;
  table_id: string;
  customer_name: string | null;
  status: string;
  table_name: string;
}

interface SessionOrder {
  id: string;
  order_number: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    total_price: number;
  }>;
}

interface SessionPayment {
  id: string;
  payment_method: string;
  amount: number;
  net_amount: number;
  created_at: string;
}

interface CartItem {
  id: string;
  name: string;
  totalPrice: number;
  quantity: number;
  complements: Complement[];
  observations?: string;
}

const methodLabel: Record<string, string> = {
  pix: "PIX", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro",
};

const TableSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [payments, setPayments] = useState<SessionPayment[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const [{ data: sess }, { data: ords }, { data: pays }] = await Promise.all([
      supabase.from("table_sessions")
        .select("id, table_id, customer_name, status, tables(name)")
        .eq("id", sessionId).maybeSingle(),
      supabase.from("orders")
        .select("id, order_number, total_amount, status, created_at, order_items(id, product_name, quantity, total_price)")
        .eq("table_session_id", sessionId)
        .order("created_at", { ascending: true }),
      supabase.from("session_payments")
        .select("id, payment_method, amount, net_amount, created_at")
        .eq("table_session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

    if (sess) {
      setSession({
        id: sess.id,
        table_id: sess.table_id,
        customer_name: sess.customer_name,
        status: sess.status,
        table_name: (sess as any).tables?.name || "Mesa",
      });
    }
    setOrders((ords || []).map((o: any) => ({
      ...o, items: o.order_items || [],
    })));
    setPayments(pays || []);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `table_session_id=eq.${sessionId}` }, fetchSession)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_payments", filter: `table_session_id=eq.${sessionId}` }, fetchSession)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchSession]);

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.totalPrice * i.quantity, 0),
    [cart]
  );
  const consumedTotal = useMemo(
    () => orders.reduce((s, o) => s + Number(o.total_amount), 0),
    [orders]
  );
  const paidTotal = useMemo(
    () => payments.reduce((s, p) => s + Number(p.amount), 0),
    [payments]
  );
  const remaining = Math.max(0, consumedTotal - paidTotal);

  const handleAddToCart = useCallback((item: AddedItem) => {
    setCart((prev) => [...prev, {
      id: Math.random().toString(),
      name: item.name,
      totalPrice: item.totalPrice,
      quantity: item.quantity,
      complements: item.complements,
      observations: item.observations,
    }]);
    toast.success(`${item.quantity}x ${item.name} adicionado`);
  }, []);

  const removeCartItem = (id: string) => setCart((p) => p.filter((i) => i.id !== id));

  const sendCartToKitchen = async () => {
    if (!session || !clientId || cart.length === 0) return;
    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          client_id: clientId,
          customer_name: session.customer_name || `Mesa ${session.table_name}`,
          payment_method: "mesa",
          total_amount: cartTotal,
          status: "novo",
          order_number: 0,
          table_session_id: session.id,
        }).select().single();
      if (orderErr) throw orderErr;

      const items = cart.map((i) => ({
        client_id: clientId,
        order_id: order.id,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.totalPrice,
        total_price: i.totalPrice * i.quantity,
        complements: i.complements as any,
        observations: i.observations || null,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Verifica modo de operação para impressão
      const { data: setting } = await supabase
        .from("system_settings").select("value").eq("key", "operation_mode").maybeSingle();
      if (setting?.value === "printer") {
        const { printOrder } = await import("@/lib/printOrder");
        printOrder({ ...order, items: items.map((it, idx) => ({ id: `i-${idx}`, ...it })) } as any);
      }

      toast.success(`Pedido #${order.order_number} enviado!`);
      setCart([]);
      fetchSession();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao enviar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const registerPayment = async (method: string, amount: number, netAmount: number) => {
    if (!session || !clientId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("session_payments").insert({
      client_id: clientId,
      table_session_id: session.id,
      payment_method: method,
      amount,
      net_amount: netAmount,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error("Erro ao registrar pagamento");
      return;
    }
    toast.success(`Pagamento de ${formatBRL(amount)} registrado`);
    fetchSession();
  };

  const handleClose = async () => {
    if (!session) return;
    if (remaining > 0.009) {
      toast.error(`Ainda há ${formatBRL(remaining)} em aberto`);
      return;
    }
    try {
      await closeTableSession(session.id);
      toast.success("Mesa fechada");
      navigate("/tables");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao fechar mesa");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout
      title={session.table_name}
      subtitle={`${session.customer_name || "Sem nome"}${session.status === "fechada" ? " • Encerrada" : ""}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)} className="gap-2">
            <DollarSign className="w-4 h-4" /> Pagamento
          </Button>
          <Button variant="default" size="sm" onClick={() => setConfirmClose(true)} className="gap-2" disabled={session.status === "fechada"}>
            <Lock className="w-4 h-4" /> Fechar mesa
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catálogo */}
        <div className="lg:col-span-2 space-y-4">
          <MenuPicker onAddItem={handleAddToCart} />
        </div>

        {/* Painel da mesa */}
        <div className="lg:col-span-1 space-y-4">
          {/* Resumo */}
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Conta da mesa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span>Consumo total</span><span>{formatBRL(consumedTotal)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Pago</span><span>{formatBRL(paidTotal)}</span></div>
              <div className={`flex justify-between text-lg font-bold ${remaining > 0 ? "text-destructive" : "text-success"}`}>
                <span>Saldo</span><span>{formatBRL(remaining)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Carrinho de novo pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Novo pedido</span>
                <Badge variant="secondary">{cart.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Selecione itens no cardápio</p>
              ) : (
                <>
                  {cart.map((it) => (
                    <div key={it.id} className="flex justify-between items-start text-sm p-2 bg-secondary rounded">
                      <div className="flex-1">
                        <p className="font-medium">{it.quantity}x {it.name}</p>
                        {it.complements.length > 0 && (
                          <p className="text-xs text-muted-foreground">+ {it.complements.map(c => c.name).join(", ")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{formatBRL(it.totalPrice * it.quantity)}</span>
                        <Button size="icon" variant="ghost" onClick={() => removeCartItem(it.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Subtotal</span><span>{formatBRL(cartTotal)}</span>
                  </div>
                  <Button className="w-full gap-2" onClick={sendCartToKitchen} disabled={submitting}>
                    <Send className="w-4 h-4" /> Enviar para cozinha
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pedidos enviados */}
          {orders.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Pedidos enviados</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="text-sm border rounded p-2">
                    <div className="flex justify-between font-medium">
                      <span>#{o.order_number}</span>
                      <span>{formatBRL(Number(o.total_amount))}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {o.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pagamentos */}
          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Pagamentos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm border rounded p-2">
                    <span>{methodLabel[p.payment_method] || p.payment_method}</span>
                    <span className="font-bold">{formatBRL(Number(p.amount))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SessionPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        remaining={remaining || consumedTotal /* permite pagamento antecipado quando ainda não há consumo */}
        onConfirm={registerPayment}
      />

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {remaining > 0.009
                ? `Ainda há ${formatBRL(remaining)} em aberto. Registre os pagamentos antes de fechar.`
                : "A mesa será marcada como fechada e ficará disponível para novo cliente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={remaining > 0.009}>Fechar mesa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default TableSession;
