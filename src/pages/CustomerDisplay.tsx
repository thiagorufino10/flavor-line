import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, UtensilsCrossed, Printer } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useState, useEffect } from "react";

const CustomerDisplay = () => {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();
  const [operationMode, setOperationMode] = useState<string>("");

  useEffect(() => {
    const mode = localStorage.getItem("operationMode") || "display";
    setOperationMode(mode);
  }, []);
  
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
      <main className="container mx-auto px-6 py-6 h-[calc(100vh-88px)]">
        {loading || !operationMode ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-3xl text-muted-foreground">
              Carregando...
            </p>
          </div>
        ) : operationMode === "printer" ? (
          <div className="flex items-center justify-center h-full">
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
        ) : (
          <div className="grid grid-cols-2 gap-0 h-full">
            {/* Em Preparação - Coluna Esquerda */}
            <div className="flex flex-col pr-6 border-r-4 border-border">
              <div className="text-center mb-6">
                <h2 className="text-4xl font-bold mb-2 text-warning">
                  Em Preparação
                </h2>
                <p className="text-xl text-muted-foreground">
                  Aguarde, estamos preparando
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {preparingOrders.length > 0 ? (
                  preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gradient-to-br from-warning/20 to-warning/10 border-2 border-warning rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-left-4 duration-500"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-warning text-xs font-semibold mb-1">
                            Pedido
                          </p>
                          <p className="text-warning text-5xl font-bold">
                            {order.order_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground text-2xl font-bold">
                            {order.customer_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="bg-card/50 rounded-lg p-3 border border-warning/30">
                              <p className="font-bold text-lg">
                                {item.quantity}x {item.product_name}
                              </p>
                              {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                                <div className="mt-2 pl-3 border-l-2 border-warning/50">
                                  <p className="text-sm text-muted-foreground font-semibold">Complementos:</p>
                                  <ul className="space-y-1">
                                    {item.complements.map((comp: any, cIdx: number) => (
                                      <li key={cIdx} className="text-sm text-muted-foreground">
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
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-2xl text-muted-foreground">
                      Nenhum pedido em preparação
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pedidos Prontos - Coluna Direita */}
            <div className="flex flex-col pl-6">
              <div className="text-center mb-6">
                <h2 className="text-4xl font-bold mb-2 text-success">
                  Pedidos Prontos
                </h2>
                <p className="text-xl text-muted-foreground">
                  Retire seu pedido no balcão
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {finishedOrders.length > 0 ? (
                  finishedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gradient-to-br from-success to-success/80 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-white/80 text-xs font-semibold mb-1">
                            Pedido
                          </p>
                          <p className="text-white text-5xl font-bold">
                            {order.order_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-2xl font-bold">
                            {order.customer_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="bg-white/20 rounded-lg p-3 border border-white/30">
                              <p className="font-bold text-lg text-white">
                                {item.quantity}x {item.product_name}
                              </p>
                              {item.complements && Array.isArray(item.complements) && item.complements.length > 0 && (
                                <div className="mt-2 pl-3 border-l-2 border-white/50">
                                  <p className="text-sm text-white/80 font-semibold">Complementos:</p>
                                  <ul className="space-y-1">
                                    {item.complements.map((comp: any, cIdx: number) => (
                                      <li key={cIdx} className="text-sm text-white/80">
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
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                      <UtensilsCrossed className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <p className="text-2xl text-muted-foreground">
                      Nenhum pedido pronto
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDisplay;
