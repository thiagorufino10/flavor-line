import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface VendaDetalhada {
  produto: string;
  formaPagamento: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

const Reports = () => {
  const navigate = useNavigate();
  const [filterStartDate, setFilterStartDate] = useState<Date>();
  const [filterEndDate, setFilterEndDate] = useState<Date>();
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("todos");
  const [filterProduct, setFilterProduct] = useState<string>("todos");
  const [showFiltered, setShowFiltered] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [vendasDetalhadas, setVendasDetalhadas] = useState<VendaDetalhada[]>([]);

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

  // Mock de dados detalhados - depois virá do banco de dados
  const vendasMock: VendaDetalhada[] = [
    { produto: "Pastel de Carne", formaPagamento: "Crédito", quantidade: 18, valorUnitario: 8.00, valorTotal: 144.00 },
    { produto: "Pastel de Carne", formaPagamento: "Dinheiro", quantidade: 4, valorUnitario: 8.00, valorTotal: 32.00 },
    { produto: "Pastel de Carne", formaPagamento: "Pix", quantidade: 3, valorUnitario: 8.00, valorTotal: 24.00 },
    { produto: "Açaí 500ml", formaPagamento: "Crédito", quantidade: 8, valorUnitario: 18.00, valorTotal: 144.00 },
    { produto: "Açaí 500ml", formaPagamento: "Débito", quantidade: 8, valorUnitario: 18.00, valorTotal: 144.00 },
    { produto: "Açaí 500ml", formaPagamento: "Pix", quantidade: 2, valorUnitario: 18.00, valorTotal: 36.00 },
    { produto: "Pastel Disco", formaPagamento: "Crédito", quantidade: 8, valorUnitario: 12.00, valorTotal: 96.00 },
    { produto: "Pastel Disco", formaPagamento: "Débito", quantidade: 4, valorUnitario: 12.00, valorTotal: 48.00 },
    { produto: "Coxinha", formaPagamento: "Crédito", quantidade: 11, valorUnitario: 6.00, valorTotal: 66.00 },
    { produto: "Coxinha", formaPagamento: "Dinheiro", quantidade: 4, valorUnitario: 6.00, valorTotal: 24.00 },
  ];

  const aplicarFiltros = () => {
    let vendas = [...vendasMock];

    // Filtrar por forma de pagamento
    if (filterPaymentMethod !== "todos") {
      const paymentLabel = paymentMethodOptions.find(p => p.value === filterPaymentMethod)?.label;
      vendas = vendas.filter(v => v.formaPagamento === paymentLabel);
    }

    // Filtrar por produto
    if (filterProduct !== "todos") {
      const produtoSelecionado = menuItems.find(item => item.id === filterProduct);
      if (produtoSelecionado) {
        vendas = vendas.filter(v => v.produto === produtoSelecionado.name);
      }
    }

    return vendas;
  };

  const calcularTotais = (vendas: VendaDetalhada[]) => {
    const totalVendas = vendas.reduce((sum, v) => sum + v.valorTotal, 0);
    const totalQuantidade = vendas.reduce((sum, v) => sum + v.quantidade, 0);
    const ticketMedio = totalQuantidade > 0 ? totalVendas / totalQuantidade : 0;

    return {
      totalVendas,
      totalQuantidade,
      ticketMedio,
      totalItens: vendas.length,
    };
  };

  const stats = calcularTotais(aplicarFiltros());

  const handleShowFiltered = () => {
    if (!filterStartDate || !filterEndDate) {
      toast({
        title: "Atenção",
        description: "Selecione o período inicial e final",
        variant: "destructive",
      });
      return;
    }
    
    const vendas = aplicarFiltros();
    setVendasDetalhadas(vendas);
    setShowFiltered(true);
    
    const paymentLabel = paymentMethodOptions.find(p => p.value === filterPaymentMethod)?.label || "Todos";
    const productLabel = filterProduct === "todos" 
      ? "Todos" 
      : menuItems.find(item => item.id === filterProduct)?.name || "Todos";
    
    toast({
      title: "Relatório Filtrado",
      description: `Exibindo ${vendas.length} registros - Pagamento: ${paymentLabel} - Produto: ${productLabel}`,
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

    const vendas = aplicarFiltros();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Vendas Detalhadas
    const vendasData = vendas.map((v) => ({
      Produto: v.produto,
      "Forma de Pagamento": v.formaPagamento,
      Quantidade: v.quantidade,
      "Valor Unitário": `R$ ${v.valorUnitario.toFixed(2)}`,
      "Valor Total": `R$ ${v.valorTotal.toFixed(2)}`,
    }));
    const ws1 = XLSX.utils.json_to_sheet(vendasData);
    XLSX.utils.book_append_sheet(wb, ws1, "Vendas Detalhadas");

    // Sheet 2: Resumo
    const totais = calcularTotais(vendas);
    const summaryData = [
      { Métrica: "Total de Vendas", Valor: `R$ ${totais.totalVendas.toFixed(2)}` },
      { Métrica: "Total de Itens Vendidos", Valor: totais.totalQuantidade },
      { Métrica: "Ticket Médio por Item", Valor: `R$ ${totais.ticketMedio.toFixed(2)}` },
      { Métrica: "Registros Encontrados", Valor: totais.totalItens },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Resumo");

    // Sheet 3: Totais por Forma de Pagamento
    const totaisPorPagamento: { [key: string]: { quantidade: number; valor: number } } = {};
    vendas.forEach(v => {
      if (!totaisPorPagamento[v.formaPagamento]) {
        totaisPorPagamento[v.formaPagamento] = { quantidade: 0, valor: 0 };
      }
      totaisPorPagamento[v.formaPagamento].quantidade += v.quantidade;
      totaisPorPagamento[v.formaPagamento].valor += v.valorTotal;
    });
    
    const pagamentoData = Object.entries(totaisPorPagamento).map(([forma, dados]) => ({
      "Forma de Pagamento": forma,
      "Quantidade Total": dados.quantidade,
      "Valor Total": `R$ ${dados.valor.toFixed(2)}`,
    }));
    const ws3 = XLSX.utils.json_to_sheet(pagamentoData);
    XLSX.utils.book_append_sheet(wb, ws3, "Totais por Pagamento");

    // Sheet 4: Totais por Produto
    const totaisPorProduto: { [key: string]: { quantidade: number; valor: number } } = {};
    vendas.forEach(v => {
      if (!totaisPorProduto[v.produto]) {
        totaisPorProduto[v.produto] = { quantidade: 0, valor: 0 };
      }
      totaisPorProduto[v.produto].quantidade += v.quantidade;
      totaisPorProduto[v.produto].valor += v.valorTotal;
    });
    
    const produtoData = Object.entries(totaisPorProduto).map(([produto, dados]) => ({
      Produto: produto,
      "Quantidade Total": dados.quantidade,
      "Valor Total": `R$ ${dados.valor.toFixed(2)}`,
    }));
    const ws4 = XLSX.utils.json_to_sheet(produtoData);
    XLSX.utils.book_append_sheet(wb, ws4, "Totais por Produto");

    // Sheet 5: Informações do Filtro
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
    const ws5 = XLSX.utils.json_to_sheet(filterData);
    XLSX.utils.book_append_sheet(wb, ws5, "Filtros Aplicados");

    const fileName = `relatorio-vendas-${format(filterStartDate, "yyyy-MM-dd")}-ate-${format(filterEndDate, "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Sucesso",
      description: "Relatório completo exportado com sucesso",
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
            <CardTitle>Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Filtros aplicados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Itens Vendidos
                  </CardTitle>
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalQuantidade}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidades totais
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ticket Médio/Item
                  </CardTitle>
                  <DollarSign className="w-5 h-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {stats.ticketMedio.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por item vendido
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

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
                    {filterStartDate ? format(filterStartDate, "dd/MM/yy", { locale: ptBR }) : "Data Inicial"}
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
                    {filterEndDate ? format(filterEndDate, "dd/MM/yy", { locale: ptBR }) : "Data Final"}
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
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">Filtros Aplicados:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Período:</span> {format(filterStartDate, "dd/MM/yy")} até {format(filterEndDate, "dd/MM/yy")}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Pagamento:</span> {paymentMethodOptions.find(p => p.value === filterPaymentMethod)?.label}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Produto:</span> {filterProduct === "todos" ? "Todos" : menuItems.find(item => item.id === filterProduct)?.name}
                    </p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Vendas Detalhadas</CardTitle>
                    <CardDescription>
                      {vendasDetalhadas.length} registro(s) encontrado(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Forma de Pagamento</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead className="text-right">Valor Unitário</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendasDetalhadas.length > 0 ? (
                            vendasDetalhadas.map((venda, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{venda.produto}</TableCell>
                                <TableCell>{venda.formaPagamento}</TableCell>
                                <TableCell className="text-right">{venda.quantidade}</TableCell>
                                <TableCell className="text-right">R$ {venda.valorUnitario.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold">R$ {venda.valorTotal.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Nenhum registro encontrado com os filtros aplicados
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {vendasDetalhadas.length > 0 && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Total Geral</p>
                            <p className="text-xl font-bold text-success">
                              R$ {vendasDetalhadas.reduce((sum, v) => sum + v.valorTotal, 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Quantidade Total</p>
                            <p className="text-xl font-bold">
                              {vendasDetalhadas.reduce((sum, v) => sum + v.quantidade, 0)} unidades
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Registros</p>
                            <p className="text-xl font-bold">
                              {vendasDetalhadas.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;
