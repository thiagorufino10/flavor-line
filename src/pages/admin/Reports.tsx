import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, TrendingUp, ShoppingCart, Users, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Reports = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("hoje");

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

  const handleExport = (type: string) => {
    // Implementar exportação futura
    console.log(`Exportando relatório: ${type}`);
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
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Cards de Resumo */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Mais Vendidos */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>Top itens do cardápio</CardDescription>
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
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>Distribuição por método</CardDescription>
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

        {/* Botões de Ação */}
        <Card>
          <CardHeader>
            <CardTitle>Exportar Relatórios</CardTitle>
            <CardDescription>
              Gere relatórios detalhados para análise externa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleExport("vendas")}
              >
                <Download className="w-5 h-5" />
                Relatório de Vendas
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleExport("produtos")}
              >
                <Download className="w-5 h-5" />
                Relatório de Produtos
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleExport("financeiro")}
              >
                <Download className="w-5 h-5" />
                Relatório Financeiro
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;
