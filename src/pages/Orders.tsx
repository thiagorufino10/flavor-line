import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ComplementsModal, Complement } from "@/components/ComplementsModal";
import { PaymentModal } from "@/components/PaymentModal";
import { useOrders } from "@/hooks/useOrders";
import Footer from "@/components/Footer";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  complements?: Complement[];
  observations?: string;
}

interface MenuCategory {
  name: string;
  category: "pasteis" | "salgados" | "acai" | "bebidas";
  items: { name: string; price: number }[];
}

const Orders = () => {
  const navigate = useNavigate();
  const { createOrder } = useOrders();
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [complementsModalOpen, setComplementsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<{
    name: string;
    price: number;
    category: "pasteis" | "salgados" | "acai" | "bebidas";
  } | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemName, setSystemName] = useState("Pastel Favorite");

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    if (savedName) setSystemName(savedName);
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("active", true)
        .order("category", { ascending: true });

      if (error) throw error;

      const categoryMap: Record<string, string> = {
        pasteis: "Pastéis",
        salgados: "Salgados",
        acai: "Açaí",
        bebidas: "Bebidas",
      };

      const groupedItems = data?.reduce((acc, item) => {
        const categoryKey = item.category;
        if (!acc[categoryKey]) {
          acc[categoryKey] = {
            name: categoryMap[categoryKey] || categoryKey,
            category: categoryKey as "pasteis" | "salgados" | "acai" | "bebidas",
            items: [],
          };
        }
        acc[categoryKey].items.push({
          name: item.name,
          price: parseFloat(String(item.price)),
        });
        return acc;
      }, {} as Record<string, MenuCategory>);

      setMenuCategories(Object.values(groupedItems || {}));
    } catch (error) {
      console.error("Erro ao buscar itens do menu:", error);
      toast.error("Erro ao carregar cardápio");
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (
    item: { name: string; price: number },
    category: "pasteis" | "salgados" | "acai" | "bebidas"
  ) => {
    // Abre o modal de complementos para todas as categorias
    setSelectedMenuItem({ ...item, category });
    setComplementsModalOpen(true);
  };

  const addItemToOrder = (
    item: { name: string; price: number },
    complements: Complement[],
    totalPrice: number,
    observations?: string
  ) => {
    const newItem: OrderItem = {
      id: Math.random().toString(),
      name: item.name,
      price: totalPrice,
      quantity: 1,
      complements,
      observations,
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

  const handlePaymentConfirm = async (paymentMethod: string, customerName: string) => {
    // Buscar modo de operação do banco
    const { data: settingData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "operation_mode")
      .maybeSingle();
    const operationMode = settingData?.value || "display";
    const destinationText = operationMode === "printer" ? "impressora" : "tela da cozinha";
    
    try {
      const items = currentOrder.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price / item.quantity,
        total_price: item.price,
        complements: item.complements || null,
        observations: item.observations || null
      }));

      const order = await createOrder(customerName, paymentMethod, getTotalPrice(), items);
      
      // Se o modo for impressora, imprimir o pedido
      if (operationMode === "printer" && order) {
        const { printOrder } = await import("@/lib/printOrder");
        printOrder(order);
      }
      
      toast.success(`Pedido de ${customerName} finalizado! Enviado para ${destinationText}`);
      setCurrentOrder([]);
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
    }
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
              <p className="text-sm text-muted-foreground">{systemName}</p>
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
          {loading ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : menuCategories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                Nenhum item no cardápio. Configure o cardápio em Administração → Cardápio.
              </CardContent>
            </Card>
          ) : (
            menuCategories.map((category) => (
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
            ))
          )}
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
                          {item.observations && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Obs: {item.observations}
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
        onConfirm={(complements, totalPrice, observations) => {
          if (selectedMenuItem) {
            addItemToOrder(selectedMenuItem, complements, totalPrice, observations);
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
      
      <Footer />
    </div>
  );
};

export default Orders;
