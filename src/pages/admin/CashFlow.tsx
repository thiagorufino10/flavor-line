import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Plus, Download, CalendarIcon, Filter, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { formatBRL } from "@/lib/format";

interface Transaction {
  id: string;
  rawDate: Date;
  type: "entrada" | "saida";
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  source: "venda" | "manual";
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
};

const formatPaymentMethod = (pm: string) => {
  if (pm.includes("/")) {
    return pm.split("/").map(p => PAYMENT_METHOD_MAP[p.trim()] || p.trim()).join(" / ");
  }
  return PAYMENT_METHOD_MAP[pm] || pm;
};

const CashFlow = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filtros
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterPayment, setFilterPayment] = useState<string>("todos");
  const [filterSource, setFilterSource] = useState<string>("todos");
  const [filterCategory, setFilterCategory] = useState<string>("todos");

  const [newTransaction, setNewTransaction] = useState({
    type: "entrada" as "entrada" | "saida",
    description: "",
    category: "",
    amount: "",
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const [
        { data: manualTx, error: e1 },
        { data: orders, error: e2 },
        { data: rates },
        { data: settings },
      ] = await Promise.all([
        supabase.from("cash_flow_transactions").select("*").order("transaction_date", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("payment_rates").select("payment_method, rate_percentage"),
        supabase.from("system_settings").select("key, value").like("key", "tax_payer_%"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const rateMap: Record<string, number> = {};
      (rates || []).forEach(r => { rateMap[r.payment_method] = parseFloat(String(r.rate_percentage)); });
      const taxPayerMap: Record<string, string> = {};
      (settings || []).forEach(s => { taxPayerMap[s.key.replace("tax_payer_", "")] = s.value; });

      // Retorna o valor líquido (o que efetivamente entra no caixa) considerando taxa do estabelecimento
      const netForMethod = (method: string, gross: number): number => {
        if (method !== "credito" && method !== "debito") return gross;
        const rate = rateMap[method] || 0;
        const payer = taxPayerMap[method] || (method === "credito" ? "cliente" : "estabelecimento");
        if (payer === "cliente") return gross; // cliente já pagou a taxa, valor cheio entra
        // estabelecimento absorve a taxa: gross = valor_base + 0; precisamos extrair a taxa de gross
        // gross é o valor base (pois o cliente não paga taxa nesse caso) → desconta a taxa
        return gross - (gross * rate / 100);
      };

      const manual: Transaction[] = (manualTx || []).map((t) => ({
        id: t.id,
        rawDate: new Date(t.transaction_date),
        type: t.transaction_type as "entrada" | "saida",
        description: t.description,
        category: t.transaction_type === "entrada" ? "Entradas Manuais" : "Despesas",
        amount: parseFloat(String(t.amount)),
        paymentMethod: undefined,
        source: "manual" as const,
      }));

      const sales: Transaction[] = (orders || []).map((order) => {
        const gross = parseFloat(String(order.total_amount));
        // Calcula líquido por método (split: divide proporcionalmente, considerando que cada parte pode ter taxa diferente)
        let net = gross;
        if (order.payment_method.includes("/")) {
          // Para split, conservadoramente aplica a regra do método mais "caro" — mantém compat antiga.
          const methods = order.payment_method.split("/").map(m => m.trim());
          const portion = gross / methods.length;
          net = methods.reduce((sum, m) => sum + netForMethod(m, portion), 0);
        } else {
          net = netForMethod(order.payment_method, gross);
        }
        return {
          id: `order-${order.id}`,
          rawDate: new Date(order.created_at),
          type: "entrada" as const,
          description: `Pedido #${order.order_number} - ${order.customer_name}`,
          category: "Vendas",
          amount: net,
          paymentMethod: formatPaymentMethod(order.payment_method),
          source: "venda" as const,
        };
      });

      setTransactions([...manual, ...sales].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()));
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
      toast({ title: "Erro", description: "Erro ao carregar transações", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Filtro de data
      if (startDate && t.rawDate < startOfDay(startDate)) return false;
      if (endDate && t.rawDate > endOfDay(endDate)) return false;
      // Tipo
      if (filterType !== "todos" && t.type !== filterType) return false;
      // Pagamento
      if (filterPayment !== "todos") {
        if (!t.paymentMethod) return false;
        if (!t.paymentMethod.toLowerCase().includes(filterPayment.toLowerCase())) return false;
      }
      // Origem
      if (filterSource !== "todos" && t.source !== filterSource) return false;
      // Categoria
      if (filterCategory !== "todos" && t.category !== filterCategory) return false;
      return true;
    });
  }, [transactions, startDate, endDate, filterType, filterPayment, filterSource, filterCategory]);

  const totalEntradas = useMemo(() => filteredTransactions.filter(t => t.type === "entrada").reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const totalSaidas = useMemo(() => filteredTransactions.filter(t => t.type === "saida").reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const saldo = totalEntradas - totalSaidas;
  const ticketMedio = useMemo(() => {
    const vendas = filteredTransactions.filter(t => t.source === "venda");
    return vendas.length > 0 ? vendas.reduce((s, t) => s + t.amount, 0) / vendas.length : 0;
  }, [filteredTransactions]);
  const totalVendas = useMemo(() => filteredTransactions.filter(t => t.source === "venda").length, [filteredTransactions]);

  const categories = useMemo(() => [...new Set(transactions.map(t => t.category))], [transactions]);
  const paymentMethods = useMemo(() => {
    const methods = new Set<string>();
    transactions.forEach(t => { if (t.paymentMethod) methods.add(t.paymentMethod); });
    return [...methods];
  }, [transactions]);

  // Resumo por forma de pagamento
  const paymentSummary = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredTransactions.filter(t => t.source === "venda").forEach(t => {
      const key = t.paymentMethod || "Outros";
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count++;
      map[key].total += t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTransactions]);

  // Resumo por categoria
  const categorySummary = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredTransactions.forEach(t => {
      if (!map[t.category]) map[t.category] = { count: 0, total: 0 };
      map[t.category].count++;
      map[t.category].total += t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTransactions]);

  const setQuickFilter = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case "hoje": setStartDate(startOfDay(today)); setEndDate(endOfDay(today)); break;
      case "semana": setStartDate(startOfWeek(today, { locale: ptBR })); setEndDate(endOfWeek(today, { locale: ptBR })); break;
      case "mes": setStartDate(startOfMonth(today)); setEndDate(endOfMonth(today)); break;
      case "7dias": setStartDate(subDays(today, 7)); setEndDate(today); break;
      case "30dias": setStartDate(subDays(today, 30)); setEndDate(today); break;
      case "mes_passado": { const lm = subMonths(today, 1); setStartDate(startOfMonth(lm)); setEndDate(endOfMonth(lm)); break; }
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setFilterType("todos");
    setFilterPayment("todos");
    setFilterSource("todos");
    setFilterCategory("todos");
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const { getClientId } = await import("@/lib/getClientId");
      const client_id = await getClientId();
      const { error } = await supabase.from("cash_flow_transactions").insert({
        client_id,
        transaction_type: newTransaction.type,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        transaction_date: new Date().toISOString(),
      });
      if (error) throw error;
      await fetchTransactions();
      setNewTransaction({ type: "entrada", description: "", category: "", amount: "" });
      setIsDialogOpen(false);
      toast({ title: "Sucesso", description: "Transação adicionada com sucesso" });
    } catch (error) {
      console.error("Erro ao adicionar transação:", error);
      toast({ title: "Erro", description: "Erro ao adicionar transação", variant: "destructive" });
    }
  };

  const handleExportToExcel = () => {
    const data = filteredTransactions.map((t) => ({
      "Data/Hora": format(t.rawDate, "dd/MM/yyyy HH:mm"),
      Tipo: t.type === "entrada" ? "Entrada" : "Saída",
      Descrição: t.description,
      Categoria: t.category,
      Origem: t.source === "venda" ? "Venda" : "Manual",
      Valor: t.amount,
      "Forma de Pagamento": t.paymentMethod || "-",
    }));

    const resumo = [
      { Indicador: "Total de Entradas", Valor: totalEntradas },
      { Indicador: "Total de Saídas", Valor: totalSaidas },
      { Indicador: "Saldo", Valor: saldo },
      { Indicador: "Total de Vendas", Valor: totalVendas },
      { Indicador: "Ticket Médio", Valor: ticketMedio },
    ];

    const pagamentos = paymentSummary.map(([method, d]) => ({
      "Forma de Pagamento": method,
      Quantidade: d.count,
      Total: d.total,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Transações");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pagamentos), "Pagamentos");
    XLSX.writeFile(wb, `fluxo-caixa-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Sucesso", description: "Relatório exportado com sucesso" });
  };

  const getPaymentBadge = (method?: string) => {
    if (!method) return null;
    const colors: Record<string, string> = {
      "Dinheiro": "bg-success/10 text-success",
      "Débito": "bg-primary/10 text-primary",
      "Crédito": "bg-warning/10 text-warning",
      "Pix": "bg-accent/10 text-accent",
    };
    // For split payments, find matching color
    const baseMethod = Object.keys(colors).find(k => method.includes(k));
    return <Badge className={colors[baseMethod || ""] || "bg-muted text-muted-foreground"}>{method}</Badge>;
  };

  const formatDate = (d: Date) => format(d, "dd/MM/yyyy HH:mm");

  const renderTable = (items: Transaction[], showPayment = true, showCategory = true) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Descrição</TableHead>
          {showCategory && <TableHead>Categoria</TableHead>}
          <TableHead>Origem</TableHead>
          {showPayment && <TableHead>Pagamento</TableHead>}
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</TableCell></TableRow>
        ) : items.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-mono text-sm whitespace-nowrap">{formatDate(t.rawDate)}</TableCell>
            <TableCell className="max-w-[250px] truncate">{t.description}</TableCell>
            {showCategory && <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>}
            <TableCell>
              <Badge variant="secondary" className="text-xs">
                {t.source === "venda" ? "Venda" : "Manual"}
              </Badge>
            </TableCell>
            {showPayment && <TableCell>{getPaymentBadge(t.paymentMethod)}</TableCell>}
            <TableCell className="text-right font-medium">
              <span className={t.type === "entrada" ? "text-success" : "text-destructive"}>
                {t.type === "entrada" ? "+" : "-"}{formatBRL(t.amount)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
                <p className="text-sm text-muted-foreground">Controle completo de entradas e saídas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Nova Transação</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adicionar Transação</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={newTransaction.type} onValueChange={(v: "entrada" | "saida") => setNewTransaction({ ...newTransaction, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição *</Label>
                      <Textarea value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} />
                    </div>
                    <div>
                      <Label>Valor *</Label>
                      <Input type="number" step="0.01" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} />
                    </div>
                    <Button onClick={handleAddTransaction} className="w-full">Adicionar</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Filter className="w-4 h-4" />Filtros</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}><RotateCcw className="w-4 h-4 mr-1" />Limpar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Atalhos rápidos */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Hoje", value: "hoje" },
                { label: "Esta Semana", value: "semana" },
                { label: "Este Mês", value: "mes" },
                { label: "Últimos 7 dias", value: "7dias" },
                { label: "Últimos 30 dias", value: "30dias" },
                { label: "Mês Passado", value: "mes_passado" },
              ].map(p => (
                <Button key={p.value} variant="outline" size="sm" onClick={() => setQuickFilter(p.value)}>{p.label}</Button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Data Inicial */}
              <div>
                <Label className="text-xs">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs font-normal h-9", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {startDate ? format(startDate, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Data Final */}
              <div>
                <Label className="text-xs">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs font-normal h-9", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {endDate ? format(endDate, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Tipo */}
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Pagamento */}
              <div>
                <Label className="text-xs">Pagamento</Label>
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                    <SelectItem value="Débito">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Origem */}
              <div>
                <Label className="text-xs">Origem</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="venda">Vendas</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Categoria */}
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Entradas</CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatBRL(totalEntradas)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Saídas</CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatBRL(totalSaidas)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Saldo</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>{formatBRL(saldo)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVendas}</div>
              <p className="text-xs text-muted-foreground">pedidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBRL(ticketMedio)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Resumos por Pagamento e Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {paymentSummary.map(([method, d]) => (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPaymentBadge(method)}
                        <span className="text-xs text-muted-foreground">({d.count})</span>
                      </div>
                      <span className="font-medium text-sm">{formatBRL(d.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {categorySummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {categorySummary.map(([cat, d]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{cat}</Badge>
                        <span className="text-xs text-muted-foreground">({d.count})</span>
                      </div>
                      <span className="font-medium text-sm">{formatBRL(d.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>{filteredTransactions.length} transações encontradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Tabs defaultValue="todas">
                <TabsList className="mb-4">
                  <TabsTrigger value="todas">Todas ({filteredTransactions.length})</TabsTrigger>
                  <TabsTrigger value="entradas">Entradas ({filteredTransactions.filter(t => t.type === "entrada").length})</TabsTrigger>
                  <TabsTrigger value="saidas">Saídas ({filteredTransactions.filter(t => t.type === "saida").length})</TabsTrigger>
                </TabsList>
                <TabsContent value="todas">{renderTable(filteredTransactions)}</TabsContent>
                <TabsContent value="entradas">{renderTable(filteredTransactions.filter(t => t.type === "entrada"))}</TabsContent>
                <TabsContent value="saidas">{renderTable(filteredTransactions.filter(t => t.type === "saida"), false)}</TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CashFlow;
