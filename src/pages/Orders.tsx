import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
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

type ProductCategory = "pasteis" | "salgados" | "acai" | "bebidas" | "doces" | "coxinha" | "cachorro_quente";

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
}

interface MenuCategory {
  name: string;
  category: ProductCategory;
  items: MenuItemData[];
}

const categoryConfig: Record<string, { label: string; emoji: string }> = {
  pasteis: { label: "Pastéis", emoji: "🥟" },
  salgados: { label: "Salgados", emoji: "🍗" },
  acai: { label: "Açaí", emoji: "🍇" },
  bebidas: { label: "Bebidas", emoji: "🥤" },
  doces: { label: "Doces", emoji: "🍰" },
  coxinha: { label: "Coxinha", emoji: "🍗" },
  cachorro_quente: { label: "Cachorro Quente", emoji: "🌭" },
};

const CATEGORY_KEYS = ["pasteis", "salgados", "acai", "bebidas", "doces", "coxinha", "cachorro_quente"];

// Pre-fetched complement data per menu item id
interface ComplementData {
  id: string;
  name: string;
  price: number;
  category: string;
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
    category: ProductCategory;
  } | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemName, setSystemName] = useState("Pastel Favorite");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Pre-fetched complements map: menuItemId -> complements[]
  const [complementsMap, setComplementsMap] = useState<Record<string, ComplementData[]>>({});
  // Pre-fetched menu item name->id map
  const [menuItemIdMap, setMenuItemIdMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    if (savedName) setSystemName(savedName);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch menu items, complements, and links in parallel
      const [menuRes, compRes, linksRes] = await Promise.all([
        supabase.from("menu_items").select("id, name, price, category").eq("active", true).order("category"),
        supabase.from("complements").select("id, name, price, category").eq("active", true),
        supabase.from("complement_menu_items").select("menu_item_id, complement_id"),
      ]);

      if (menuRes.error) throw menuRes.error;
      if (compRes.error) throw compRes.error;
      if (linksRes.error) throw linksRes.error;

      const menuItems = menuRes.data || [];
      const complements = compRes.data || [];
      const links = linksRes.data || [];

      // Build complements lookup
      const compById: Record<string, ComplementData> = {};
      complements.forEach(c => {
        compById[c.id] = { id: c.id, name: c.name, price: parseFloat(String(c.price)), category: c.category };
      });

      // Build complementsMap: menuItemId -> complements[]
      const cMap: Record<string, ComplementData[]> = {};
      links.forEach(link => {
        if (!cMap[link.menu_item_id]) cMap[link.menu_item_id] = [];
        const comp = compById[link.complement_id];
        if (comp) cMap[link.menu_item_id].push(comp);
      });
      setComplementsMap(cMap);

      // Build id map and categories
      const idMap: Record<string, string> = {};
      const grouped: Record<string, MenuCategory> = {};

      menuItems.forEach(item => {
        const key = `${item.name}_${item.category}`;
        idMap[key] = item.id;
        
        if (!grouped[item.category]) {
          grouped[item.category] = {
            name: categoryConfig[item.category]?.label || item.category,
            category: item.category as ProductCategory,
            items: [],
          };
        }
        grouped[item.category].items.push({
          id: item.id,
          name: item.name,
          price: parseFloat(String(item.price)),
          category: item.category as ProductCategory,
        });
      });

      setMenuItemIdMap(idMap);
      setMenuCategories(Object.values(grouped));
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar cardápio");
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = useCallback((item: MenuItemData) => {
    setSelectedMenuItem({ name: item.name, price: item.price, category: item.category });
    setComplementsModalOpen(true);
  }, []);

  const addItemToOrder = useCallback((
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
    setCurrentOrder(prev => [...prev, newItem]);
    toast.success(`${item.name} adicionado ao pedido`);
  }, []);

  const removeItem = useCallback((id: string) => {
    setCurrentOrder(prev => prev.filter(item => item.id !== id));
  }, []);

  const getTotalPrice = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [currentOrder]);

  const finishOrder = useCallback(() => {
    if (currentOrder.length === 0) {
      toast.error("Adicione itens ao pedido primeiro");
      return;
    }
    setPaymentModalOpen(true);
  }, [currentOrder.length]);

  const handlePaymentConfirm = useCallback(async (paymentMethod: string, customerName: string) => {
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

      const order = await createOrder(customerName, paymentMethod, getTotalPrice, items);
      
      if (operationMode === "printer" && order) {
        const { printOrder } = await import("@/lib/printOrder");
        const orderWithItems = {
          ...order,
          items: items.map((item, index) => ({
            id: `item-${index}`,
            ...item,
          })),
        };
        printOrder(orderWithItems);
      }
      
      toast.success(`Pedido de ${customerName} finalizado! Enviado para ${destinationText}`);
      setCurrentOrder([]);
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
    }
  }, [currentOrder, getTotalPrice, createOrder]);

  // Get pre-fetched complements for the selected item
  const getComplementsForItem = useCallback((itemName: string, category: ProductCategory): ComplementData[] => {
    const key = `${itemName}_${category}`;
    const menuItemId = menuItemIdMap[key];
    if (!menuItemId) return [];
    return complementsMap[menuItemId] || [];
  }, [menuItemIdMap, complementsMap]);

  const activeCategory = useMemo(() => 
    menuCategories.find(c => c.category === selectedCategory),
    [menuCategories, selectedCategory]
  );

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
        <div className="lg:col-span-2 space-y-4">
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
          ) : !selectedCategory ? (
            <div className="grid grid-cols-2 gap-4">
              {CATEGORY_KEYS.map((catKey) => {
                const cat = menuCategories.find(c => c.category === catKey);
                const conf = categoryConfig[catKey];
                const itemCount = cat?.items.length || 0;
                return (
                  <Button
                    key={catKey}
                    variant="outline"
                    className="h-32 flex flex-col gap-2 text-lg hover:bg-primary hover:text-primary-foreground transition-colors border-2"
                    onClick={() => setSelectedCategory(catKey)}
                    disabled={itemCount === 0}
                  >
                    <span className="text-4xl">{conf.emoji}</span>
                    <span className="font-bold">{conf.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "item" : "itens"}
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCategory(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-xl">
                  {categoryConfig[selectedCategory]?.emoji} {activeCategory?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activeCategory?.items.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleItemClick(item)}
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
                      <span className="text-primary">R$ {getTotalPrice.toFixed(2)}</span>
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

      {/* Modal de Complementos - now with pre-fetched data */}
      <ComplementsModal
        open={complementsModalOpen}
        onOpenChange={setComplementsModalOpen}
        item={selectedMenuItem}
        prefetchedComplements={selectedMenuItem ? getComplementsForItem(selectedMenuItem.name, selectedMenuItem.category) : undefined}
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
        totalAmount={getTotalPrice}
        onConfirm={handlePaymentConfirm}
      />
      
      <Footer />
    </div>
  );
};

export default Orders;
