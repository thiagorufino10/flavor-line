import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, TrendingUp, ShoppingCart, Users, DollarSign, CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { ptBR } from "date-fns/locale";

const Reports = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("hoje");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const getDateRange = () => {
    const today = new Date();
    switch (period) {
      case "hoje":
        return { start: today, end: today };
      case "semana":
        return { start: startOfWeek(today, { locale: ptBR }), end: endOfWeek(today, { locale: ptBR }) };
      case "mes":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "ano":
        return { start: startOfYear(today), end: endOfYear(today) };
      case "personalizado":
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: today, end: today };
    }
  };

  // Mock de dados - depois virá do banco de dados
  const stats = {
    totalVendas: 1250.00,
    totalPedidos: 45,
    ticketMedio: 27.78,
    clientesAtendidos: 38,
  };

  const topProducts = [
    { name: "Pastel de Carne", quantity: 25, revenue: 200.00 },
    { name: "Açaí 500ml", quantity: 18, revenue: 324.00 },
    { name: "Pastel Disco", quantity: 12, revenue: 144.00 },
    { name: "Coxinha", quantity: 15, revenue: 90.00 },
  ];

  const paymentMethods = [
    { method: "Crédito", count: 20, amount: 550.00, percentage: 44 },
    { method: "Débito", count: 12, amount: 380.00, percentage: 30 },
    { method: "Dinheiro", count: 8, amount: 220.00, percentage: 18 },
    { method: "Pix", count: 5, amount: 100.00, percentage: 8 },
  ];

  const handleExportTopProducts = () => {
    const data = topProducts.map((p) => ({
      Produto: p.name,
      Quantidade: p.quantity,
      "Receita Total": p.revenue,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Top Produtos");
    XLSX.writeFile(wb, `top-produtos-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório de produtos exportado",
    });
  };

  const handleExportPaymentMethods = () => {
    const data = paymentMethods.map((p) => ({
      "Forma de Pagamento": p.method,
      Total: p.amount,
      Transações: p.count,
      Percentual: `${p.percentage}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Formas de Pagamento");
    XLSX.writeFile(wb, `formas-pagamento-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório de formas de pagamento exportado",
    });
  };

  const handleExportSummary = () => {
    const data = [
      { Métrica: "Total de Vendas", Valor: stats.totalVendas },
      { Métrica: "Total de Pedidos", Valor: stats.totalPedidos },
      { Métrica: "Ticket Médio", Valor: stats.ticketMedio },
      { Métrica: "Clientes Atendidos", Valor: stats.clientesAtendidos },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
    XLSX.writeFile(wb, `resumo-vendas-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Resumo exportado",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Relatórios</h1>
                <p className="text-sm text-muted-foreground">
                  Análises e insights do seu negócio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {period === "personalizado" && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "PPP", { locale: ptBR }) : "Data Inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "PPP", { locale: ptBR }) : "Data Final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Cards de Resumo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumo de Vendas</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportSummary}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Vendas
              </CardTitle>
              <DollarSign className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                R$ {stats.totalVendas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                +12% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pedidos
              </CardTitle>
              <ShoppingCart className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPedidos}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                +8% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <DollarSign className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                R$ {stats.ticketMedio.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por pedido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Atendidos
              </CardTitle>
              <Users className="w-5 h-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.clientesAtendidos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Únicos no período
              </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Mais Vendidos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                  <CardDescription>Top itens do cardápio</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportTopProducts}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">
                        R$ {product.revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Formas de Pagamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Formas de Pagamento</CardTitle>
                  <CardDescription>Distribuição por método</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPaymentMethods}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((payment, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{payment.method}</span>
                      <span className="text-sm text-muted-foreground">
                        {payment.count} transações
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${payment.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold min-w-24 text-right">
                        R$ {payment.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;
