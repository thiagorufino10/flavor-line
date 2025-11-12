import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, ChefHat, Clock, Printer } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { format } from "date-fns";
import { useState, useEffect } from "react";

const Kitchen = () => {
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus } = useOrders();
  const [operationMode, setOperationMode] = useState<string>("");

  useEffect(() => {
    const mode = localStorage.getItem("operationMode") || "display";
    setOperationMode(mode);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; color: string }> = {
      novo: { label: "Novo", variant: "default" as const, color: "bg-primary" },
      preparando: { label: "Preparando", variant: "secondary" as const, color: "bg-warning" },
      finalizado: { label: "Finalizado", variant: "outline" as const, color: "bg-success" }
    };
    
    return statusConfig[status] || statusConfig.novo;
  };

  const filterOrders = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  if (loading || !operationMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando pedidos...</p>
      </div>
    );
  }

  if (operationMode === "printer") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Tela da Cozinha</h1>
                <p className="text-sm text-muted-foreground">Kitchen Display System</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Printer className="w-6 h-6" />
                Modo Impressora Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                O sistema está configurado para usar impressora térmica.
                Os pedidos são enviados diretamente para impressão.
              </p>
              <p className="text-sm text-muted-foreground">
                Para usar esta tela, configure o modo de operação para "Display" em Administração → Modo de Operação.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tela da Cozinha</h1>
              <p className="text-sm text-muted-foreground">Kitchen Display System</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Novos Pedidos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <h2 className="text-xl font-bold">Novos Pedidos</h2>
              <Badge variant="secondary">{filterOrders("novo").length}</Badge>
            </div>
            
            {filterOrders("novo").map(order => (
              <Card key={order.id} className="border-primary shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold">#{order.order_number}</span>
                    <Badge className={getStatusBadge(order.status).color}>
                      {getStatusBadge(order.status).label}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(new Date(order.created_at), "HH:mm")}
                  </div>
                  <div className="mt-2 p-2 bg-primary/10 rounded-md">
                    <p className="text-sm font-semibold text-primary">Cliente: {order.customer_name}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                          <p className="font-bold text-base mb-1">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2 border-primary/30">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Complementos:</p>
                              <ul className="space-y-0.5">
                                {item.complements.map((comp: any, cIdx: number) => (
                                  <li key={cIdx} className="text-sm text-muted-foreground">
                                    • {comp.name}
                                    {comp.price > 0 && ` (+R$ ${comp.price.toFixed(2)})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem itens</p>
                    )}
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => updateOrderStatus(order.id, "preparando")}
                  >
                    Iniciar Preparo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Em Preparação */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <h2 className="text-xl font-bold">Em Preparação</h2>
              <Badge variant="secondary">{filterOrders("preparando").length}</Badge>
            </div>
            
            {filterOrders("preparando").map(order => (
              <Card key={order.id} className="border-warning shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold">#{order.order_number}</span>
                    <Badge className={getStatusBadge(order.status).color}>
                      {getStatusBadge(order.status).label}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(new Date(order.created_at), "HH:mm")}
                  </div>
                  <div className="mt-2 p-2 bg-warning/10 rounded-md">
                    <p className="text-sm font-semibold text-warning">Cliente: {order.customer_name}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-warning/20">
                          <p className="font-bold text-base mb-1">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2 border-warning/50">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Complementos:</p>
                              <ul className="space-y-0.5">
                                {item.complements.map((comp: any, cIdx: number) => (
                                  <li key={cIdx} className="text-sm text-muted-foreground">
                                    • {comp.name}
                                    {comp.price > 0 && ` (+R$ ${comp.price.toFixed(2)})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem itens</p>
                    )}
                  </div>
                  <Button 
                    className="w-full bg-success hover:bg-success/90"
                    onClick={() => updateOrderStatus(order.id, "finalizado")}
                  >
                    Finalizar Pedido
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Finalizados */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <h2 className="text-xl font-bold">Finalizados</h2>
              <Badge variant="secondary">{filterOrders("finalizado").length}</Badge>
            </div>
            
            {filterOrders("finalizado").map(order => (
              <Card key={order.id} className="border-success opacity-75">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold">#{order.order_number}</span>
                    <Badge className={getStatusBadge(order.status).color}>
                      {getStatusBadge(order.status).label}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(new Date(order.created_at), "HH:mm")}
                  </div>
                  <div className="mt-2 p-2 bg-success/10 rounded-md">
                    <p className="text-sm font-semibold text-success">Cliente: {order.customer_name}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-success/20 opacity-75">
                          <p className="font-bold text-base mb-1 line-through">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2 border-success/30">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Complementos:</p>
                              <ul className="space-y-0.5">
                                {item.complements.map((comp: any, cIdx: number) => (
                                  <li key={cIdx} className="text-sm text-muted-foreground line-through">
                                    • {comp.name}
                                    {comp.price > 0 && ` (+R$ ${comp.price.toFixed(2)})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem itens</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Kitchen;
