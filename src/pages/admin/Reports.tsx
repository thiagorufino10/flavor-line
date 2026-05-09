import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { DollarSign, ShoppingCart, CalendarIcon, FileSpreadsheet, Eye, TrendingUp, Users, BarChart3, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { ptBR } from "date-fns/locale";
import { useSales, SaleDetail } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { AppLayout } from "@/components/AppLayout";

const paymentMethodLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
};

const statusLabel: Record<string, string> = {
  novo: "Novo",
  preparando: "Preparando",
  pronto: "Pronto",
  entregue: "Entregue",
};

const combineDateTime = (date: Date | undefined, time: string, isEnd: boolean): Date | undefined => {
  if (!date) return undefined;
  const d = new Date(date);
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, isEnd ? 59 : 0, isEnd ? 999 : 0);
  } else {
    d.setHours(isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0);
  }
  return d;
};

const Reports = () => {
  const navigate = useNavigate();
  const [filterStartDate, setFilterStartDate] = useState<Date>();
  const [filterEndDate, setFilterEndDate] = useState<Date>();
  const [filterStartTime, setFilterStartTime] = useState<string>("");
  const [filterEndTime, setFilterEndTime] = useState<string>("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("todos");
  const [filterProduct, setFilterProduct] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [menuItems, setMenuItems] = useState<{ id: string; name: string }[]>([]);
  const effectiveStart = useMemo(() => combineDateTime(filterStartDate, filterStartTime, false), [filterStartDate, filterStartTime]);
  const effectiveEnd = useMemo(() => combineDateTime(filterEndDate, filterEndTime, true), [filterEndDate, filterEndTime]);
  const { sales, orders, loading } = useSales(effectiveStart, effectiveEnd);

  useEffect(() => {
    const fetchMenuItems = async () => {
      const { data } = await supabase.from("menu_items").select("id, name").eq("active", true).order("name");
      if (data) setMenuItems(data);
    };
    fetchMenuItems();
  }, []);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (filterPaymentMethod !== "todos") {
      result = result.filter(v => {
        // Support split payments like "dinheiro/pix"
        const methods = v.formaPagamento.split("/");
        return methods.includes(filterPaymentMethod);
      });
    }
    if (filterProduct !== "todos") {
      result = result.filter(v => v.produto === filterProduct);
    }
    if (filterStatus !== "todos") {
      result = result.filter(v => v.status === filterStatus);
    }
    return result;
  }, [sales, filterPaymentMethod, filterProduct, filterStatus]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (filterPaymentMethod !== "todos") {
      result = result.filter(o => {
        const methods = o.payment_method.split("/");
        return methods.includes(filterPaymentMethod);
      });
    }
    if (filterStatus !== "todos") {
      result = result.filter(o => o.status === filterStatus);
    }
    return result;
  }, [orders, filterPaymentMethod, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    // Faturamento bruto = soma do total dos pedidos (inclui taxa de cartão paga pelo cliente e taxa de entrega).
    // Usamos orders.total_amount em vez da soma dos itens para alinhar com o Fluxo de Caixa.
    const totalVendas = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalQuantidade = filteredSales.reduce((sum, v) => sum + v.quantidade, 0);
    const ticketMedio = filteredOrders.length > 0
      ? totalVendas / filteredOrders.length
      : 0;
    const totalPedidos = filteredOrders.length;
    return { totalVendas, totalQuantidade, ticketMedio, totalPedidos };
  }, [filteredSales, filteredOrders]);

  // Breakdown by payment method
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredOrders.forEach(o => {
      const methods = o.payment_method.split("/");
      methods.forEach(m => {
        const key = m.trim();
        if (!map[key]) map[key] = { count: 0, total: 0 };
        map[key].count += 1;
        map[key].total += o.total_amount / methods.length;
      });
    });
    return Object.entries(map)
      .map(([method, data]) => ({ method, label: paymentMethodLabel[method] || method, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  // Top products
  const productRanking = useMemo(() => {
    const map: Record<string, { quantidade: number; total: number }> = {};
    filteredSales.forEach(v => {
      if (!map[v.produto]) map[v.produto] = { quantidade: 0, total: 0 };
      map[v.produto].quantidade += v.quantidade;
      map[v.produto].total += v.valorTotal;
    });
    return Object.entries(map)
      .map(([produto, data]) => ({ produto, ...data }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredSales]);

  // Sales by hour
  const salesByHour = useMemo(() => {
    const map: Record<number, { pedidos: number; total: number }> = {};
    filteredOrders.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      if (!map[hour]) map[hour] = { pedidos: 0, total: 0 };
      map[hour].pedidos += 1;
      map[hour].total += o.total_amount;
    });
    return Object.entries(map)
      .map(([h, data]) => ({ hora: `${h.padStart(2, "0")}:00`, ...data }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [filteredOrders]);

  // Sales by day
  const salesByDay = useMemo(() => {
    const map: Record<string, { pedidos: number; total: number; itens: number }> = {};
    filteredOrders.forEach(o => {
      const day = format(new Date(o.created_at), "dd/MM/yyyy");
      if (!map[day]) map[day] = { pedidos: 0, total: 0, itens: 0 };
      map[day].pedidos += 1;
      map[day].total += o.total_amount;
      map[day].itens += o.items_count;
    });
    return Object.entries(map)
      .map(([dia, data]) => ({ dia, ...data }))
      .sort((a, b) => {
        const [da, ma, ya] = a.dia.split("/").map(Number);
        const [db, mb, yb] = b.dia.split("/").map(Number);
        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
      });
  }, [filteredOrders]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map)
      .map(([status, count]) => ({ status, label: statusLabel[status] || status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  const handleExport = () => {
    if (!filterStartDate || !filterEndDate) {
      toast({ title: "Atenção", description: "Selecione o período", variant: "destructive" });
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Vendas por Item
    const vendasData = filteredSales.map(v => ({
      "Pedido #": v.numeroPedido,
      Cliente: v.clienteNome,
      Produto: v.produto,
      Quantidade: v.quantidade,
      "Valor Unitário": v.valorUnitario,
      "Valor Total": v.valorTotal,
      "Forma de Pagamento": paymentMethodLabel[v.formaPagamento] || v.formaPagamento,
      Data: format(new Date(v.dataPedido), "dd/MM/yyyy HH:mm"),
      Status: statusLabel[v.status] || v.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendasData), "Vendas Detalhadas");

    // Sheet 2: Pedidos
    const pedidosData = filteredOrders.map(o => ({
      "Pedido #": o.order_number,
      Cliente: o.customer_name,
      "Valor Total": o.total_amount,
      "Forma de Pagamento": o.payment_method.split("/").map(m => paymentMethodLabel[m.trim()] || m).join(" / "),
      Status: statusLabel[o.status] || o.status,
      "Qtd Itens": o.items_count,
      Data: format(new Date(o.created_at), "dd/MM/yyyy HH:mm"),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pedidosData), "Pedidos");

    // Sheet 3: Ranking de Produtos
    const produtoData = productRanking.map((p, i) => ({
      "#": i + 1,
      Produto: p.produto,
      "Qtd Vendida": p.quantidade,
      "Faturamento": p.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(produtoData), "Ranking Produtos");

    // Sheet 4: Por Forma de Pagamento
    const pgtoData = paymentBreakdown.map(p => ({
      "Forma de Pagamento": p.label,
      "Nº Pedidos": p.count,
      "Valor Total": p.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pgtoData), "Por Pagamento");

    // Sheet 5: Por Dia
    const diaData = salesByDay.map(d => ({
      Dia: d.dia,
      Pedidos: d.pedidos,
      Itens: d.itens,
      Faturamento: d.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diaData), "Por Dia");

    // Sheet 6: Por Horário
    const horaData = salesByHour.map(h => ({
      Horário: h.hora,
      Pedidos: h.pedidos,
      Faturamento: h.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(horaData), "Por Horário");

    // Sheet 7: Resumo
    const resumo = [
      { Métrica: "Total de Pedidos", Valor: stats.totalPedidos },
      { Métrica: "Itens Vendidos", Valor: stats.totalQuantidade },
      { Métrica: "Faturamento Total", Valor: formatBRL(stats.totalVendas) },
      { Métrica: "Ticket Médio", Valor: formatBRL(stats.ticketMedio) },
      { Métrica: "Período", Valor: `${format(filterStartDate, "dd/MM/yyyy")} a ${format(filterEndDate, "dd/MM/yyyy")}` },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");

    const fileName = `relatorio-${format(filterStartDate, "yyyy-MM-dd")}-ate-${format(filterEndDate, "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Exportado!", description: "Relatório Excel gerado com sucesso" });
  };

  const formatPaymentMethod = (pm: string) =>
    pm.split("/").map(m => paymentMethodLabel[m.trim()] || m).join(" / ");

  return (
    <AppLayout title="Relatórios" subtitle="Análises completas do seu negócio">
<main className="container mx-auto px-4 py-6 space-y-6">
        {/* Aviso sobre valor bruto */}
        <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Valor bruto faturado:</strong> os totais aqui representam o que foi vendido, sem descontar taxas de cartão. Para ver o que efetivamente entrou no caixa (líquido), consulte <strong className="text-foreground">Fluxo de Caixa</strong>.
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal text-sm", !filterStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterStartDate ? format(filterStartDate, "dd/MM/yy", { locale: ptBR }) : "Data Inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterStartDate} onSelect={setFilterStartDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal text-sm", !filterEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterEndDate ? format(filterEndDate, "dd/MM/yy", { locale: ptBR }) : "Data Final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterEndDate} onSelect={setFilterEndDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Pagamentos</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Produtos</SelectItem>
                  {menuItems.map(item => (
                    <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="preparando">Preparando</SelectItem>
                  <SelectItem value="pronto">Pronto</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleExport} variant="secondary" className="gap-2" disabled={!filterStartDate || !filterEndDate}>
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>
              {(filterStartDate || filterEndDate || filterPaymentMethod !== "todos" || filterProduct !== "todos" || filterStatus !== "todos") && (
                <Button variant="ghost" onClick={() => {
                  setFilterStartDate(undefined);
                  setFilterEndDate(undefined);
                  setFilterPaymentMethod("todos");
                  setFilterProduct("todos");
                  setFilterStatus("todos");
                }}>
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Carregando relatórios...</p>
          </div>
        ) : (
          <>
            {/* Cards Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatBRL(stats.totalVendas)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPedidos}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Itens Vendidos</CardTitle>
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalQuantidade}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatBRL(stats.ticketMedio)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs de relatórios */}
            <Tabs defaultValue="vendas" className="space-y-4">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
                <TabsTrigger value="vendas">Vendas</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
                <TabsTrigger value="produtos">Produtos</TabsTrigger>
                <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
                <TabsTrigger value="horarios">Horários</TabsTrigger>
                <TabsTrigger value="diario">Diário</TabsTrigger>
              </TabsList>

              {/* Vendas Detalhadas */}
              <TabsContent value="vendas">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Item</CardTitle>
                    <CardDescription>{filteredSales.length} registro(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.length > 0 ? filteredSales.map((v, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">#{v.numeroPedido}</TableCell>
                              <TableCell>{v.produto}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{formatPaymentMethod(v.formaPagamento)}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{v.quantidade}</TableCell>
                              <TableCell className="text-right">{formatBRL(v.valorUnitario)}</TableCell>
                              <TableCell className="text-right font-bold">{formatBRL(v.valorTotal)}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                Nenhum registro encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredSales.length > 0 && (
                      <div className="mt-4 p-3 bg-muted rounded-lg flex justify-between items-center">
                        <span className="font-semibold">Total:</span>
                        <span className="text-xl font-bold text-primary">{formatBRL(filteredSales.reduce((s, v) => s + v.valorTotal, 0))}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pedidos */}
              <TabsContent value="pedidos">
                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Pedidos</CardTitle>
                    <CardDescription>{filteredOrders.length} pedido(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Itens</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOrders.length > 0 ? filteredOrders.map(o => (
                            <TableRow key={o.id}>
                              <TableCell className="font-bold">{o.order_number}</TableCell>
                              <TableCell>{o.customer_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{formatPaymentMethod(o.payment_method)}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">{statusLabel[o.status] || o.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{o.items_count}</TableCell>
                              <TableCell className="text-right font-bold">{formatBRL(o.total_amount)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(o.created_at), "dd/MM HH:mm")}
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                Nenhum pedido encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Ranking de Produtos */}
              <TabsContent value="produtos">
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking de Produtos</CardTitle>
                    <CardDescription>Produtos mais vendidos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd Vendida</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productRanking.length > 0 ? productRanking.map((p, i) => (
                            <TableRow key={p.produto}>
                              <TableCell>
                                <Badge variant={i < 3 ? "default" : "secondary"} className="text-xs">
                                  {i + 1}º
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{p.produto}</TableCell>
                              <TableCell className="text-right">{p.quantidade}</TableCell>
                              <TableCell className="text-right font-bold">{formatBRL(p.total)}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                Nenhum dado disponível
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Por Forma de Pagamento */}
              <TabsContent value="pagamentos">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo por Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {paymentBreakdown.length > 0 ? paymentBreakdown.map(p => {
                          const pct = stats.totalPedidos > 0 ? (p.count / stats.totalPedidos * 100) : 0;
                          return (
                            <div key={p.method} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{p.label}</span>
                                <span className="text-sm text-muted-foreground">{p.count} pedido(s)</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="font-bold text-sm w-28 text-right">{formatBRL(p.total)}</span>
                              </div>
                            </div>
                          );
                        }) : (
                          <p className="text-center text-muted-foreground py-4">Nenhum dado</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Status dos Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {statusBreakdown.length > 0 ? statusBreakdown.map(s => (
                          <div key={s.status} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <Badge variant="secondary">{s.label}</Badge>
                            <span className="font-bold text-lg">{s.count}</span>
                          </div>
                        )) : (
                          <p className="text-center text-muted-foreground py-4">Nenhum dado</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Por Horário */}
              <TabsContent value="horarios">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Horário</CardTitle>
                    <CardDescription>Horários de pico do seu negócio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Horário</TableHead>
                            <TableHead className="text-right">Pedidos</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesByHour.length > 0 ? salesByHour.map(h => (
                            <TableRow key={h.hora}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  {h.hora}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{h.pedidos}</TableCell>
                              <TableCell className="text-right font-bold">{formatBRL(h.total)}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                Nenhum dado disponível
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Diário */}
              <TabsContent value="diario">
                <Card>
                  <CardHeader>
                    <CardTitle>Relatório Diário</CardTitle>
                    <CardDescription>Desempenho por dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dia</TableHead>
                            <TableHead className="text-right">Pedidos</TableHead>
                            <TableHead className="text-right">Itens</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                            <TableHead className="text-right">Média/Pedido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesByDay.length > 0 ? salesByDay.map(d => (
                            <TableRow key={d.dia}>
                              <TableCell className="font-medium">{d.dia}</TableCell>
                              <TableCell className="text-right">{d.pedidos}</TableCell>
                              <TableCell className="text-right">{d.itens}</TableCell>
                              <TableCell className="text-right font-bold">{formatBRL(d.total)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{formatBRL((d.total / d.pedidos))}
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Nenhum dado disponível
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AppLayout>
  );
};

export default Reports;
