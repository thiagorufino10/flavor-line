import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ComplementsModal, Complement } from "@/components/ComplementsModal";
import { PaymentModal } from "@/components/PaymentModal";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  complements?: Complement[];
}

const Orders = () => {
  const navigate = useNavigate();
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [complementsModalOpen, setComplementsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<{
    name: string;
    price: number;
    category: "pasteis" | "salgados" | "acai";
  } | null>(null);

  const menuCategories = [
    {
      name: "Pastéis",
      category: "pasteis" as const,
      items: [
        { name: "Pastel de Carne", price: 8.00 },
        { name: "Pastel de Queijo", price: 7.00 },
        { name: "Pastel Disco", price: 12.00 },
        { name: "Pastel de Frango", price: 8.00 }
      ]
    },
    {
      name: "Salgados",
      category: "salgados" as const,
      items: [
        { name: "Coxinha", price: 6.00 },
        { name: "Kibe", price: 6.00 },
        { name: "Risole", price: 6.00 }
      ]
    },
    {
      name: "Açaí",
      category: "acai" as const,
      items: [
        { name: "Açaí 300ml", price: 12.00 },
        { name: "Açaí 500ml", price: 18.00 }
      ]
    },
    {
      name: "Bebidas",
      category: "bebidas" as const,
      items: [
        { name: "Refrigerante", price: 5.00 },
        { name: "Suco Natural", price: 8.00 },
        { name: "Água", price: 3.00 }
      ]
    }
  ];

  const handleItemClick = (
    item: { name: string; price: number },
    category: "pasteis" | "salgados" | "acai" | "bebidas"
  ) => {
    // Bebidas não têm complementos, adiciona direto
    if (category === "bebidas") {
      addItemToOrder(item, [], item.price);
      return;
    }

    // Para Pastéis, Salgados e Açaí, abre o modal de complementos
    setSelectedMenuItem({ ...item, category });
    setComplementsModalOpen(true);
  };

  const addItemToOrder = (
    item: { name: string; price: number },
    complements: Complement[],
    totalPrice: number
  ) => {
    const newItem: OrderItem = {
      id: Math.random().toString(),
      name: item.name,
      price: totalPrice,
      quantity: 1,
      complements,
    };

    setCurrentOrder([...currentOrder, newItem]);
    toast.success(`${item.name} adicionado ao pedido`);
  };

  const removeItem = (id: string) => {
    setCurrentOrder(currentOrder.filter(item => item.id !== id));
  };

  const getTotalPrice = () => {
    return currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const finishOrder = () => {
    if (currentOrder.length === 0) {
      toast.error("Adicione itens ao pedido primeiro");
      return;
    }
    setPaymentModalOpen(true);
  };

  const handlePaymentConfirm = (paymentMethod: string, destination: "kitchen" | "printer") => {
    // TODO: Salvar pedido no banco quando Lovable Cloud estiver ativo
    const destinationText = destination === "kitchen" ? "tela da cozinha" : "impressora";
    toast.success(`Pedido finalizado! Pagamento: ${paymentMethod} - Enviado para ${destinationText}`);
    setCurrentOrder([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Novo Pedido</h1>
              <p className="text-sm text-muted-foreground">Atendente</p>
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
      <div className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="lg:col-span-2 space-y-6">
          {menuCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="text-xl">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {category.items.map((item) => (
                    <Button
                      key={item.name}
                      variant="outline"
                      className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleItemClick(item, category.category)}
                    >
                      <span className="font-semibold text-sm">{item.name}</span>
                      <span className="text-lg font-bold">
                        R$ {item.price.toFixed(2)}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pedido Atual
                <Badge variant="secondary">
                  {currentOrder.length} {currentOrder.length === 1 ? 'item' : 'itens'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentOrder.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum item adicionado
                </p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {currentOrder.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity}x R$ {item.price.toFixed(2)}
                          </p>
                          {item.complements && item.complements.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              + {item.complements.map(c => c.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">R$ {getTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 text-lg font-semibold"
                    onClick={finishOrder}
                  >
                    Finalizar Pedido
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Complementos */}
      <ComplementsModal
        open={complementsModalOpen}
        onOpenChange={setComplementsModalOpen}
        item={selectedMenuItem}
        onConfirm={(complements, totalPrice) => {
          if (selectedMenuItem) {
            addItemToOrder(selectedMenuItem, complements, totalPrice);
          }
        }}
      />

      {/* Modal de Pagamento */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        totalAmount={getTotalPrice()}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
};

export default Orders;
