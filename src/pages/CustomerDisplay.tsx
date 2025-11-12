import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, UtensilsCrossed } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";

const CustomerDisplay = () => {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();
  
  const preparingOrders = orders.filter(order => order.status === "preparando");
  const finishedOrders = orders.filter(order => order.status === "finalizado");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Pastel Favorite</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            size="sm"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Display */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">
              Carregando...
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Em Preparação */}
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-5xl font-bold mb-2 text-warning">
                  Em Preparação
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Seu pedido está sendo preparado
                </p>
              </div>

              {preparingOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gradient-to-br from-warning/20 to-warning/10 border-2 border-warning rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                      <div className="text-center mb-4">
                        <p className="text-warning text-sm font-semibold mb-1">
                          Pedido
                        </p>
                        <p className="text-warning text-5xl font-bold mb-2">
                          {order.order_number}
                        </p>
                        <p className="text-foreground text-lg font-medium">
                          {order.customer_name}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="bg-card/50 rounded-lg p-3 border border-warning/30">
                              <p className="font-bold text-sm">
                                {item.quantity}x {item.product_name}
                              </p>
                              {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                                <div className="mt-1 pl-3 border-l-2 border-warning/50">
                                  <p className="text-xs text-muted-foreground font-semibold">Complementos:</p>
                                  <ul className="space-y-0.5">
                                    {item.complements.map((comp: any, cIdx: number) => (
                                      <li key={cIdx} className="text-xs text-muted-foreground">
                                        • {comp.name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center">Sem itens</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xl text-muted-foreground">
                  Nenhum pedido em preparação
                </p>
              )}
            </div>

            {/* Finalizados */}
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-5xl font-bold mb-2 text-success">
                  Pedidos Prontos
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Retire seu pedido no balcão
                </p>
              </div>

              {finishedOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {finishedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gradient-to-br from-success to-success/80 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                      <div className="text-center mb-4">
                        <p className="text-white/80 text-sm font-semibold mb-1">
                          Pedido
                        </p>
                        <p className="text-white text-5xl font-bold mb-2">
                          {order.order_number}
                        </p>
                        <p className="text-white/90 text-lg font-medium">
                          {order.customer_name}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="bg-white/20 rounded-lg p-3 border border-white/30">
                              <p className="font-bold text-sm text-white">
                                {item.quantity}x {item.product_name}
                              </p>
                              {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                                <div className="mt-1 pl-3 border-l-2 border-white/50">
                                  <p className="text-xs text-white/80 font-semibold">Complementos:</p>
                                  <ul className="space-y-0.5">
                                    {item.complements.map((comp: any, cIdx: number) => (
                                      <li key={cIdx} className="text-xs text-white/80">
                                        • {comp.name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-white/70 text-center">Sem itens</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <UtensilsCrossed className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-xl text-muted-foreground">
                    Nenhum pedido pronto no momento
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDisplay;
