import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, ShoppingCart, ArrowLeft, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ComplementsModal, Complement } from "@/components/ComplementsModal";
import { PaymentModal } from "@/components/PaymentModal";
import { useOrders } from "@/hooks/useOrders";
import Footer from "@/components/Footer";
import { formatBRL } from "@/lib/format";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  complements?: Complement[];
  observations?: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
}

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface MenuCategory {
  category: CategoryRow;
  items: MenuItemData[];
}

interface ComplementData {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const { createOrder } = useOrders();
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [complementsModalOpen, setComplementsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<{
    id: string;
    name: string;
    price: number;
    category_id: string;
  } | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [menuByCat, setMenuByCat] = useState<Record<string, MenuItemData[]>>({});
  const [loading, setLoading] = useState(true);
  const [systemName, setSystemName] = useState("TARMFood");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // menu_item_id -> complements
  const [complementsMap, setComplementsMap] = useState<Record<string, ComplementData[]>>({});

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    if (savedName) setSystemName(savedName);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [catRes, menuRes, compRes, linksRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug, image_url, sort_order").eq("active", true).order("sort_order"),
        supabase.from("menu_items").select("id, name, price, category_id").eq("active", true),
        supabase.from("complements").select("id, name, price, category_id").eq("active", true),
        supabase.from("complement_menu_items").select("menu_item_id, complement_id"),
      ]);

      if (catRes.error) throw catRes.error;
      if (menuRes.error) throw menuRes.error;
      if (compRes.error) throw compRes.error;
      if (linksRes.error) throw linksRes.error;

      const cats = (catRes.data || []) as CategoryRow[];
      const menuItems = (menuRes.data || []) as any[];
      const complements = (compRes.data || []) as any[];
      const links = (linksRes.data || []) as any[];

      const compById: Record<string, ComplementData> = {};
      complements.forEach((c) => {
        compById[c.id] = {
          id: c.id,
          name: c.name,
          price: parseFloat(String(c.price)),
          category_id: c.category_id,
        };
      });

      const cMap: Record<string, ComplementData[]> = {};
      links.forEach((link) => {
        if (!cMap[link.menu_item_id]) cMap[link.menu_item_id] = [];
        const comp = compById[link.complement_id];
        if (comp) cMap[link.menu_item_id].push(comp);
      });
      setComplementsMap(cMap);

      const grouped: Record<string, MenuItemData[]> = {};
      menuItems.forEach((item) => {
        if (!item.category_id) return;
        if (!grouped[item.category_id]) grouped[item.category_id] = [];
        grouped[item.category_id].push({
          id: item.id,
          name: item.name,
          price: parseFloat(String(item.price)),
          category_id: item.category_id,
        });
      });

      setCategories(cats);
      setMenuByCat(grouped);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar cardápio");
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = useCallback((item: MenuItemData) => {
    setSelectedMenuItem({ id: item.id, name: item.name, price: item.price, category_id: item.category_id });
    setComplementsModalOpen(true);
  }, []);

  const addItemToOrder = useCallback(
    (
      item: { name: string; price: number },
      complements: Complement[],
      totalPrice: number,
      observations?: string,
      quantity?: number,
    ) => {
      const qty = quantity || 1;
      const newItem: OrderItem = {
        id: Math.random().toString(),
        name: item.name,
        price: totalPrice,
        quantity: qty,
        complements,
        observations,
      };
      setCurrentOrder((prev) => [...prev, newItem]);
      toast.success(`${qty}x ${item.name} adicionado ao pedido`);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setCurrentOrder((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getTotalPrice = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [currentOrder]);

  const finishOrder = useCallback(() => {
    if (currentOrder.length === 0) {
      toast.error("Adicione itens ao pedido primeiro");
      return;
    }
    setPaymentModalOpen(true);
  }, [currentOrder.length]);

  const handlePaymentConfirm = useCallback(
    async (
      paymentMethod: string,
      customerName: string,
      splitPayments?: Array<{ method: string; amount: number }>,
    ) => {
      const { data: settingData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "operation_mode")
        .maybeSingle();
      const operationMode = settingData?.value || "display";
      const destinationText = operationMode === "printer" ? "impressora" : "tela da cozinha";

      try {
        const items = currentOrder.map((item) => ({
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price / item.quantity,
          total_price: item.price,
          complements: item.complements || null,
          observations: item.observations || null,
        }));

        const order = await createOrder(customerName, paymentMethod, getTotalPrice, items, splitPayments);

        if (operationMode === "printer" && order) {
          const { printOrder } = await import("@/lib/printOrder");
          const orderWithItems = {
            ...order,
            items: items.map((item, index) => ({ id: `item-${index}`, ...item })),
          };
          printOrder(orderWithItems);
        }

        toast.success(`Pedido de ${customerName} finalizado! Enviado para ${destinationText}`);
        setCurrentOrder([]);
      } catch (error) {
        console.error("Erro ao criar pedido:", error);
      }
    },
    [currentOrder, getTotalPrice, createOrder],
  );

  const getComplementsForItem = useCallback(
    (menuItemId: string): ComplementData[] => {
      return complementsMap[menuItemId] || [];
    },
    [complementsMap],
  );

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );
  const activeItems = useMemo(
    () => (selectedCategoryId ? menuByCat[selectedCategoryId] || [] : []),
    [selectedCategoryId, menuByCat],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                Nenhuma categoria cadastrada. Crie categorias em Administração → Categorias.
              </CardContent>
            </Card>
          ) : !selectedCategoryId ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const itemCount = menuByCat[cat.id]?.length || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    disabled={itemCount === 0}
                    className="group relative aspect-square rounded-xl border-2 border-border bg-card overflow-hidden hover:border-primary hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left flex flex-col"
                  >
                    {cat.image_url ? (
                      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="max-w-[70%] max-h-[70%] object-contain group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-muted">
                        <ImagePlus className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="bg-card border-t p-2 text-center">
                      <p className="font-bold text-sm sm:text-base leading-tight">{cat.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {itemCount} {itemCount === 1 ? "item" : "itens"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedCategoryId(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {activeCategory?.image_url && (
                  <img
                    src={activeCategory.image_url}
                    alt={activeCategory.name}
                    className="w-10 h-10 rounded-md object-cover"
                  />
                )}
                <CardTitle className="text-xl">{activeCategory?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activeItems.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="font-semibold text-sm">{item.name}</span>
                      <span className="text-lg font-bold">{formatBRL(item.price)}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pedido Atual
                <Badge variant="secondary">
                  {currentOrder.length} {currentOrder.length === 1 ? "item" : "itens"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentOrder.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum item adicionado</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {currentOrder.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity}x{formatBRL(item.price)}
                          </p>
                          {item.complements && item.complements.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              + {item.complements.map((c) => c.name).join(", ")}
                            </p>
                          )}
                          {item.observations && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Obs: {item.observations}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatBRL(item.price * item.quantity)}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatBRL(getTotalPrice)}</span>
                    </div>
                  </div>

                  <Button className="w-full h-12 text-lg font-semibold" onClick={finishOrder}>
                    Finalizar Pedido
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ComplementsModal
        open={complementsModalOpen}
        onOpenChange={setComplementsModalOpen}
        item={selectedMenuItem}
        prefetchedComplements={selectedMenuItem ? getComplementsForItem(selectedMenuItem.id) : undefined}
        onConfirm={(complements, totalPrice, observations, quantity) => {
          if (selectedMenuItem) {
            addItemToOrder(selectedMenuItem, complements, totalPrice, observations, quantity);
          }
        }}
      />

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
