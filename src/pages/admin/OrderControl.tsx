import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/format";

interface OrderRow {
  id: string;
  order_number: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  origin: string;
  created_at: string;
  deleted_at: string | null;
}

const OrderControl = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, total_amount, payment_method, status, origin, created_at, deleted_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar pedidos", variant: "destructive" });
    } else {
      setOrders((data || []) as OrderRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir o pedido", variant: "destructive" });
      return;
    }
    toast({ title: "Pedido excluído", description: "Removido do financeiro. Você pode reativar a qualquer momento." });
    fetchOrders();
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível reativar o pedido", variant: "destructive" });
      return;
    }
    toast({ title: "Pedido reativado", description: "Voltou a aparecer no financeiro." });
    fetchOrders();
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(o.order_number).includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.payment_method?.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout title="Controle de Pedidos" subtitle="Excluir pedidos do financeiro e reativar quando necessário">
      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          Pedidos excluídos somem do <strong>Financeiro</strong> e demais relatórios, mas continuam aqui riscados para você poder reativá-los.
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº, cliente ou pagamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={fetchOrders}>Atualizar</Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
              ) : filtered.map((o) => {
                const deleted = !!o.deleted_at;
                return (
                  <TableRow key={o.id} className={deleted ? "opacity-60" : ""}>
                    <TableCell className={`font-mono text-sm whitespace-nowrap ${deleted ? "line-through" : ""}`}>
                      {format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className={deleted ? "line-through" : ""}>#{o.order_number}</TableCell>
                    <TableCell className={deleted ? "line-through" : ""}>{o.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={deleted ? "line-through" : ""}>{o.origin}</Badge>
                    </TableCell>
                    <TableCell className={deleted ? "line-through" : ""}>{o.payment_method}</TableCell>
                    <TableCell className={`text-right font-medium ${deleted ? "line-through" : ""}`}>
                      {formatBRL(parseFloat(String(o.total_amount)))}
                    </TableCell>
                    <TableCell className="text-right">
                      {deleted ? (
                        <Button size="sm" variant="outline" onClick={() => handleRestore(o.id)}>
                          <RotateCcw className="w-4 h-4 mr-1" /> Reativar
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir pedido #{o.order_number}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O pedido será removido do financeiro e dos relatórios. Ele continuará aparecendo aqui riscado e pode ser reativado a qualquer momento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(o.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </AppLayout>
  );
};

export default OrderControl;
