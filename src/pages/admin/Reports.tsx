import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, ShoppingCart, Users, DollarSign, CalendarIcon, FileSpreadsheet, Eye } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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

const Reports = () => {
  const navigate = useNavigate();
  const [filterStartDate, setFilterStartDate] = useState<Date>();
  const [filterEndDate, setFilterEndDate] = useState<Date>();
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("todos");
  const [filterProduct, setFilterProduct] = useState<string>("todos");
  const [showFiltered, setShowFiltered] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("menuItems");
    if (stored) {
      setMenuItems(JSON.parse(stored));
    }
  }, []);

  const paymentMethodOptions = [
    { value: "todos", label: "Todos" },
    { value: "pix", label: "Pix" },
    { value: "dinheiro", label: "Dinheiro" },
    { value: "debito", label: "Débito" },
    { value: "credito", label: "Crédito" },
  ];

  // Mock de dados - depois virá do banco de dados (dados completos sem filtro)
  const allData = {
    pix: { vendas: 100.00, pedidos: 5, produtos: { "Pastel de Carne": 3, "Açaí 500ml": 2 } },
    dinheiro: { vendas: 220.00, pedidos: 8, produtos: { "Pastel de Carne": 4, "Coxinha": 4 } },
    debito: { vendas: 380.00, pedidos: 12, produtos: { "Açaí 500ml": 8, "Pastel Disco": 4 } },
    credito: { vendas: 550.00, pedidos: 20, produtos: { "Pastel de Carne": 18, "Pastel Disco": 8, "Açaí 500ml": 8, "Coxinha": 11 } },
  };

  // Aplicar filtros
  const getFilteredStats = () => {
    let totalVendas = 0;
    let totalPedidos = 0;
    let produtosCombinados: any = {};

    const paymentMethods = filterPaymentMethod === "todos" 
      ? ["pix", "dinheiro", "debito", "credito"]
      : [filterPaymentMethod];

    paymentMethods.forEach(method => {
      const data = allData[method as keyof typeof allData];
      if (data) {
        totalVendas += data.vendas;
        totalPedidos += data.pedidos;
        
        Object.entries(data.produtos).forEach(([produto, qty]) => {
          if (!produtosCombinados[produto]) {
            produtosCombinados[produto] = 0;
          }
          produtosCombinados[produto] += qty;
        });
      }
    });

    // Filtrar por produto se necessário
    if (filterProduct !== "todos") {
      const produtoSelecionado = menuItems.find(item => item.id === filterProduct);
      if (produtoSelecionado) {
        const qtyProduto = produtosCombinados[produtoSelecionado.name] || 0;
        totalPedidos = qtyProduto;
        totalVendas = qtyProduto * (produtoSelecionado.price || 0);
        produtosCombinados = { [produtoSelecionado.name]: qtyProduto };
      }
    }

    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

    return {
      totalVendas,
      totalPedidos,
      ticketMedio,
      clientesAtendidos: Math.floor(totalPedidos * 0.85),
      produtos: produtosCombinados,
    };
  };

  const stats = getFilteredStats();

  const topProducts = Object.entries(stats.produtos)
    .map(([name, quantity]) => ({
      name,
      quantity: quantity as number,
      revenue: (quantity as number) * 8.00, // Mock price
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const paymentMethods = [
    { method: "Crédito", count: 20, amount: 550.00, percentage: 44 },
    { method: "Débito", count: 12, amount: 380.00, percentage: 30 },
    { method: "Dinheiro", count: 8, amount: 220.00, percentage: 18 },
    { method: "Pix", count: 5, amount: 100.00, percentage: 8 },
  ].filter(pm => {
    if (filterPaymentMethod === "todos") return true;
    return pm.method.toLowerCase() === filterPaymentMethod.toLowerCase();
  });

  const handleShowFiltered = () => {
    if (!filterStartDate || !filterEndDate) {
      toast({
        title: "Atenção",
        description: "Selecione o período inicial e final",
        variant: "destructive",
      });
      return;
    }
    
    setShowFiltered(true);
    
    const paymentLabel = paymentMethodOptions.find(p => p.value === filterPaymentMethod)?.label || "Todos";
    const productLabel = filterProduct === "todos" 
      ? "Todos" 
      : menuItems.find(item => item.id === filterProduct)?.name || "Todos";
    
    toast({
      title: "Relatório Filtrado",
      description: `Exibindo dados de ${format(filterStartDate, "PPP", { locale: ptBR })} até ${format(filterEndDate, "PPP", { locale: ptBR })} - Pagamento: ${paymentLabel} - Produto: ${productLabel}`,
    });
  };

  const handleExportComplete = () => {
    if (!filterStartDate || !filterEndDate) {
      toast({
        title: "Atenção",
        description: "Selecione o período inicial e final",
        variant: "destructive",
      });
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumo de Vendas
    const summaryData = [
      { Métrica: "Total de Vendas", Valor: `R$ ${stats.totalVendas.toFixed(2)}` },
      { Métrica: "Total de Pedidos", Valor: stats.totalPedidos },
      { Métrica: "Ticket Médio", Valor: `R$ ${stats.ticketMedio.toFixed(2)}` },
      { Métrica: "Clientes Atendidos", Valor: stats.clientesAtendidos },
    ];
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumo de Vendas");

    // Sheet 2: Produtos
    const productsData = topProducts.map((p) => ({
      Produto: p.name,
      Quantidade: p.quantity,
      "Receita Total": `R$ ${p.revenue.toFixed(2)}`,
    }));
    const ws2 = XLSX.utils.json_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, ws2, "Produtos");

    // Sheet 3: Formas de Pagamento
    const paymentsData = paymentMethods.map((p) => ({
      "Forma de Pagamento": p.method,
      Total: `R$ ${p.amount.toFixed(2)}`,
      Transações: p.count,
      Percentual: `${p.percentage}%`,
    }));
    const ws3 = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, ws3, "Formas de Pagamento");

    // Sheet 4: Informações do Filtro
    const paymentLabel = paymentMethodOptions.find(p => p.value === filterPaymentMethod)?.label || "Todos";
    const productLabel = filterProduct === "todos" 
      ? "Todos" 
      : menuItems.find(item => item.id === filterProduct)?.name || "Todos";
    
    const filterData = [
      { Campo: "Data Inicial", Valor: format(filterStartDate, "PPP", { locale: ptBR }) },
      { Campo: "Data Final", Valor: format(filterEndDate, "PPP", { locale: ptBR }) },
      { Campo: "Forma de Pagamento", Valor: paymentLabel },
      { Campo: "Produto", Valor: productLabel },
      { Campo: "Data da Exportação", Valor: format(new Date(), "PPP", { locale: ptBR }) },
    ];
    const ws4 = XLSX.utils.json_to_sheet(filterData);
    XLSX.utils.book_append_sheet(wb, ws4, "Filtros Aplicados");

    const fileName = `relatorio-completo-${format(filterStartDate, "yyyy-MM-dd")}-ate-${format(filterEndDate, "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Sucesso",
      description: "Relatório completo exportado",
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Cards de Resumo */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Vendas</CardTitle>
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
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>Top itens do cardápio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum produto encontrado com os filtros aplicados</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formas de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>Distribuição por método</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((payment, index) => (
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma forma de pagamento encontrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Filtro e Exportação */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrar e Exportar Relatório Completo</CardTitle>
            <CardDescription>
              Selecione o período, forma de pagamento e produto desejados para visualizar ou exportar os dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Inicial */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filterStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterStartDate ? format(filterStartDate, "PPP", { locale: ptBR }) : "Data Inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterStartDate}
                    onSelect={setFilterStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Data Final */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filterEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterEndDate ? format(filterEndDate, "PPP", { locale: ptBR }) : "Data Final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterEndDate}
                    onSelect={setFilterEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Forma de Pagamento */}
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Forma de Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Produto */}
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleShowFiltered} className="gap-2">
                <Eye className="w-4 h-4" />
                Visualizar Filtrado
              </Button>
              <Button onClick={handleExportComplete} variant="secondary" className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar para Excel
              </Button>
            </div>

            {showFiltered && filterStartDate && filterEndDate && (
              <div className="mt-6 p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold text-lg">Período e Filtros Selecionados:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Período:</span> {format(filterStartDate, "PPP", { locale: ptBR })} até {format(filterEndDate, "PPP", { locale: ptBR })}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Pagamento:</span> {paymentMethodOptions.find(p => p.value === filterPaymentMethod)?.label}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Produto:</span> {filterProduct === "todos" ? "Todos" : menuItems.find(item => item.id === filterProduct)?.name}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total de Vendas</p>
                    <p className="text-xl font-bold">R$ {stats.totalVendas.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="text-xl font-bold">{stats.totalPedidos}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ticket Médio</p>
                    <p className="text-xl font-bold">R$ {stats.ticketMedio.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="text-xl font-bold">{stats.clientesAtendidos}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;
