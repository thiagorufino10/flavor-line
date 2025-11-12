import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, ChefHat, Clock } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { format } from "date-fns";

const Kitchen = () => {
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus } = useOrders();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando pedidos...</p>
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
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <p key={idx} className="text-sm font-medium">
                        {item.quantity}x {item.product_name}
                      </p>
                    ))}
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
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <p key={idx} className="text-sm font-medium">
                        {item.quantity}x {item.product_name}
                      </p>
                    ))}
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
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <p key={idx} className="text-sm font-medium line-through opacity-50">
                        {item.quantity}x {item.product_name}
                      </p>
                    ))}
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
