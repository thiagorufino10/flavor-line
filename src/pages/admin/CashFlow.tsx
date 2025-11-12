import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Plus, Download, CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

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
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [newTransaction, setNewTransaction] = useState({
    type: "entrada" as "entrada" | "saida",
    description: "",
    category: "",
    amount: "",
    paymentMethod: "",
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Buscar transações manuais do banco
      const { data: manualTransactions, error: manualError } = await supabase
        .from("cash_flow_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (manualError) throw manualError;

      // Buscar pedidos (vendas automáticas)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Formatar transações manuais
      const formattedManual = manualTransactions?.map((t) => ({
        id: t.id,
        date: new Date(t.transaction_date).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: t.transaction_type as "entrada" | "saida",
        description: t.description,
        category: t.transaction_type === "entrada" ? "Entradas Manuais" : "Despesas",
        amount: parseFloat(String(t.amount)),
        paymentMethod: undefined,
      })) || [];

      // Formatar vendas (pedidos) como entradas com forma de pagamento
      const formattedOrders = orders?.map((order) => {
        const paymentMethodMap: Record<string, string> = {
          credito: "Crédito",
          debito: "Débito",
          pix: "Pix",
          dinheiro: "Dinheiro",
        };
        
        return {
          id: `order-${order.id}`,
          date: new Date(order.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: "entrada" as const,
          description: `Pedido #${order.order_number} - ${order.customer_name}`,
          category: "Vendas",
          amount: parseFloat(String(order.total_amount)),
          paymentMethod: paymentMethodMap[order.payment_method] || order.payment_method,
        };
      }) || [];

      // Combinar e ordenar todas as transações
      const allTransactions = [...formattedManual, ...formattedOrders].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!startDate && !endDate) return true;
    const transactionDate = new Date(t.date);
    if (startDate && endDate) {
      return transactionDate >= startDate && transactionDate <= endDate;
    }
    if (startDate) {
      return transactionDate >= startDate;
    }
    if (endDate) {
      return transactionDate <= endDate;
    }
    return true;
  });

  const totalEntradas = filteredTransactions
    .filter(t => t.type === "entrada")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = filteredTransactions
    .filter(t => t.type === "saida")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("cash_flow_transactions")
        .insert({
          transaction_type: newTransaction.type,
          description: newTransaction.description,
          amount: parseFloat(newTransaction.amount),
          transaction_date: new Date().toISOString(),
        });

      if (error) throw error;

      await fetchTransactions();
      
      setNewTransaction({
        type: "entrada",
        description: "",
        category: "",
        amount: "",
        paymentMethod: "",
      });
      setIsDialogOpen(false);
      
      toast({
        title: "Sucesso",
        description: "Transação adicionada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao adicionar transação:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar transação",
        variant: "destructive",
      });
    }
  };

  const handleExportToExcel = () => {
    const data = filteredTransactions.map((t) => ({
      Data: t.date,
      Tipo: t.type === "entrada" ? "Entrada" : "Saída",
      Descrição: t.description,
      Categoria: t.category,
      Valor: t.amount,
      "Forma de Pagamento": t.paymentMethod || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
    XLSX.writeFile(wb, `fluxo-caixa-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso",
    });
  };

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
                <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhe todas as entradas e saídas do seu negócio
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Transação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Transação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="type">Tipo *</Label>
                      <Select
                        value={newTransaction.type}
                        onValueChange={(value: "entrada" | "saida") =>
                          setNewTransaction({ ...newTransaction, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição *</Label>
                      <Textarea
                        id="description"
                        value={newTransaction.description}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, description: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Input
                        id="category"
                        value={newTransaction.category}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, category: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Valor *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={newTransaction.amount}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, amount: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment">Forma de Pagamento</Label>
                      <Input
                        id="payment"
                        value={newTransaction.paymentMethod}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })
                        }
                      />
                    </div>
                    <Button onClick={handleAddTransaction} className="w-full">
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Filtros de Período */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

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
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma transação encontrada. As vendas aparecerão automaticamente aqui.
              </div>
            ) : (
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
                    {filteredTransactions.map((transaction) => (
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
                    {filteredTransactions
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
                    {filteredTransactions
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CashFlow;
