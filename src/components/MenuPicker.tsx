import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { ComplementsModal, Complement } from "@/components/ComplementsModal";
import { formatBRL } from "@/lib/format";

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

interface ComplementData {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

export interface AddedItem {
  name: string;
  totalPrice: number; // unit price already includes complements
  quantity: number;
  complements: Complement[];
  observations?: string;
}

interface MenuPickerProps {
  onAddItem: (item: AddedItem) => void;
}

export const MenuPicker = ({ onAddItem }: MenuPickerProps) => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [menuByCat, setMenuByCat] = useState<Record<string, MenuItemData[]>>({});
  const [complementsMap, setComplementsMap] = useState<Record<string, ComplementData[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [complementsModalOpen, setComplementsModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemData | null>(null);

  useEffect(() => {
    (async () => {
      const [catRes, menuRes, compRes, linksRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug, image_url, sort_order").eq("active", true).order("sort_order"),
        supabase.from("menu_items").select("id, name, price, category_id").eq("active", true),
        supabase.from("complements").select("id, name, price, category_id").eq("active", true),
        supabase.from("complement_menu_items").select("menu_item_id, complement_id"),
      ]);
      const cats = (catRes.data || []) as CategoryRow[];
      const menuItems = (menuRes.data || []) as any[];
      const complements = (compRes.data || []) as any[];
      const links = (linksRes.data || []) as any[];

      const compById: Record<string, ComplementData> = {};
      complements.forEach((c) => {
        compById[c.id] = { id: c.id, name: c.name, price: parseFloat(String(c.price)), category_id: c.category_id };
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
          id: item.id, name: item.name,
          price: parseFloat(String(item.price)),
          category_id: item.category_id,
        });
      });
      setCategories(cats);
      setMenuByCat(grouped);
      setLoading(false);
    })();
  }, []);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );
  const activeItems = useMemo(
    () => (selectedCategoryId ? menuByCat[selectedCategoryId] || [] : []),
    [selectedCategoryId, menuByCat]
  );

  const getComplementsForItem = useCallback(
    (id: string) => complementsMap[id] || [],
    [complementsMap]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          Nenhuma categoria cadastrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {!selectedCategoryId ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const itemCount = menuByCat[cat.id]?.length || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                disabled={itemCount === 0}
                className="group relative aspect-square rounded-xl border-2 border-border bg-card overflow-hidden hover:border-primary hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImagePlus className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-white font-bold text-base sm:text-lg leading-tight">{cat.name}</p>
                  <p className="text-white/80 text-xs">{itemCount} {itemCount === 1 ? "item" : "itens"}</p>
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
              <img src={activeCategory.image_url} alt={activeCategory.name} className="w-10 h-10 rounded-md object-cover" />
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
                  onClick={() => { setSelectedMenuItem(item); setComplementsModalOpen(true); }}
                >
                  <span className="font-semibold text-sm">{item.name}</span>
                  <span className="text-lg font-bold">{formatBRL(item.price)}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ComplementsModal
        open={complementsModalOpen}
        onOpenChange={setComplementsModalOpen}
        item={selectedMenuItem}
        prefetchedComplements={selectedMenuItem ? getComplementsForItem(selectedMenuItem.id) : undefined}
        onConfirm={(complements, totalPrice, observations, quantity) => {
          if (!selectedMenuItem) return;
          onAddItem({
            name: selectedMenuItem.name,
            totalPrice,
            quantity: quantity || 1,
            complements,
            observations,
          });
        }}
      />
    </>
  );
};
