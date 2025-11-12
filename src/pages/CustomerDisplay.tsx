import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, UtensilsCrossed } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";

const CustomerDisplay = () => {
  const navigate = useNavigate();
  const { orders, loading } = useOrders("finalizado");
  
  const finishedOrders = orders.map(order => ({
    number: order.order_number,
    customerName: order.customer_name
  }));

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
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold mb-4">
            Pedidos Prontos
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Retire seu pedido no balcão
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">
              Carregando...
            </p>
          </div>
        ) : (
          <>
            {/* Orders Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {finishedOrders.map((order) => (
                <div
                  key={order.number}
                  className="aspect-square bg-gradient-to-br from-primary to-primary/80 rounded-3xl shadow-2xl flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <div className="text-center px-4">
                    <p className="text-white/80 text-base md:text-lg font-semibold mb-1">
                      Pedido
                    </p>
                    <p className="text-white text-5xl md:text-7xl font-bold mb-2">
                      {order.number}
                    </p>
                    <p className="text-white/90 text-sm md:text-base font-medium truncate">
                      {order.customerName}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {finishedOrders.length === 0 && (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <UtensilsCrossed className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-2xl text-muted-foreground">
                  Nenhum pedido pronto no momento
                </p>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-16 text-center">
              <p className="text-muted-foreground">
                Os números dos pedidos aparecerão aqui quando estiverem prontos
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerDisplay;
