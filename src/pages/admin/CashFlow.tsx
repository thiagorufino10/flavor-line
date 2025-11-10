import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: string;
  date: string;
  type: "entrada" | "saida";
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
}

const CashFlow = () => {
  const navigate = useNavigate();
  
  // Mock de transações - depois virá do banco de dados
  const [transactions] = useState<Transaction[]>([
    {
      id: "1",
      date: "2025-11-10 14:30",
      type: "entrada",
      description: "Pedido #001",
      category: "Vendas",
      amount: 45.50,
      paymentMethod: "Crédito"
    },
    {
      id: "2",
      date: "2025-11-10 14:45",
      type: "entrada",
      description: "Pedido #002",
      category: "Vendas",
      amount: 28.00,
      paymentMethod: "Dinheiro"
    },
    {
      id: "3",
      date: "2025-11-10 15:00",
      type: "saida",
      description: "Compra de ingredientes",
      category: "Fornecedores",
      amount: 350.00,
    },
    {
      id: "4",
      date: "2025-11-10 15:30",
      type: "entrada",
      description: "Pedido #003",
      category: "Vendas",
      amount: 67.00,
      paymentMethod: "Débito"
    },
  ]);

  const totalEntradas = transactions
    .filter(t => t.type === "entrada")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === "saida")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

  const getPaymentMethodBadge = (method?: string) => {
    if (!method) return null;
    const colors: Record<string, string> = {
      "Dinheiro": "bg-success/10 text-success",
      "Débito": "bg-primary/10 text-primary",
      "Crédito": "bg-warning/10 text-warning",
      "Pix": "bg-accent/10 text-accent",
    };
    return (
      <Badge className={colors[method] || "bg-muted"}>
        {method}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe todas as entradas e saídas do seu negócio
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Entradas
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {totalEntradas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vendas e recebimentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Saídas
              </CardTitle>
              <TrendingDown className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {totalSaidas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Despesas e pagamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo do Período
              </CardTitle>
              <DollarSign className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {saldo.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Diferença entre entradas e saídas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Transações */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>
              Últimas movimentações financeiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="todas">
              <TabsList className="mb-4">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="entradas">Entradas</TabsTrigger>
                <TabsTrigger value="saidas">Saídas</TabsTrigger>
              </TabsList>

              <TabsContent value="todas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.date}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodBadge(transaction.paymentMethod)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={transaction.type === "entrada" ? "text-success" : "text-destructive"}>
                            {transaction.type === "entrada" ? "+" : "-"}
                            R$ {transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="entradas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === "entrada")
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.date}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {getPaymentMethodBadge(transaction.paymentMethod)}
                          </TableCell>
                          <TableCell className="text-right text-success">
                            +R$ {transaction.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="saidas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.type === "saida")
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.date}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -R$ {transaction.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CashFlow;
