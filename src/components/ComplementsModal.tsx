import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface Complement {
  id: string;
  name: string;
  price: number;
  category: "pasteis" | "salgados" | "acai" | "bebidas" | "doces" | "coxinha" | "cachorro_quente";
  isSpecial: boolean;
}

interface ComplementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    name: string;
    price: number;
    category: "pasteis" | "salgados" | "acai" | "bebidas" | "doces" | "coxinha" | "cachorro_quente";
  } | null;
  prefetchedComplements?: { id: string; name: string; price: number; category: string }[];
  onConfirm: (selectedComplements: Complement[], totalPrice: number, observations?: string) => void;
}

export const ComplementsModal = ({
  open,
  onOpenChange,
  item,
  prefetchedComplements,
  onConfirm,
}: ComplementsModalProps) => {
  const [selectedComplements, setSelectedComplements] = useState<Set<string>>(new Set());
  const [totalPrice, setTotalPrice] = useState(0);
  const [availableComplements, setAvailableComplements] = useState<Complement[]>([]);
  const [loading, setLoading] = useState(false);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (item && open) {
      if (prefetchedComplements) {
        // Use pre-fetched data instantly
        const formatted = prefetchedComplements.map(comp => ({
          id: comp.id,
          name: comp.name,
          price: comp.price,
          category: comp.category as Complement["category"],
          isSpecial: comp.price > 0,
        }));
        setAvailableComplements(formatted);
        setLoading(false);
      } else {
        fetchComplements();
      }
    }
  }, [item, open, prefetchedComplements]);

  const fetchComplements = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
      // Buscar o ID do produto pelo nome
      const { data: menuItemData, error: menuError } = await supabase
        .from("menu_items")
        .select("id")
        .eq("name", item.name)
        .eq("category", item.category)
        .eq("active", true)
        .maybeSingle();

      if (menuError) throw menuError;
      
      if (!menuItemData) {
        setAvailableComplements([]);
        return;
      }

      // Buscar complementos vinculados a este produto específico
      const { data, error } = await supabase
        .from("complements")
        .select(`
          *,
          complement_menu_items!inner (
            menu_item_id
          )
        `)
        .eq("active", true)
        .eq("complement_menu_items.menu_item_id", menuItemData.id);

      if (error) throw error;

      const formatted = data?.map(comp => ({
        id: comp.id,
        name: comp.name,
        price: parseFloat(String(comp.price)),
        category: comp.category as "pasteis" | "salgados" | "acai",
        isSpecial: parseFloat(String(comp.price)) > 0,
      })) || [];

      setAvailableComplements(formatted);
    } catch (error) {
      console.error("Erro ao buscar complementos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar complementos pela categoria do item
  const freeComplements = availableComplements.filter((c) => !c.isSpecial);
  const specialComplements = availableComplements.filter((c) => c.isSpecial);

  const getItemPriceByComplements = (itemName: string, basePrice: number, complementCount: number): number => {
    const nameLower = itemName.toLowerCase();
    
    if (nameLower.includes("coxinha de camarão") || nameLower.includes("coxinha de camarao")) {
      if (complementCount >= 4) return 14;
      if (complementCount >= 3) return 13;
      return 12;
    }
    
    if (nameLower.includes("coxinha especial")) {
      if (complementCount >= 4) return 12;
      if (complementCount >= 3) return 11;
      return 10;
    }
    
    return basePrice;
  };

  useEffect(() => {
    if (item) {
      const complementCount = selectedComplements.size;
      let total = getItemPriceByComplements(item.name, item.price, complementCount);
      
      // Adicionar preço dos complementos especiais (pagos)
      selectedComplements.forEach((complementId) => {
        const complement = availableComplements.find((c) => c.id === complementId);
        if (complement && complement.isSpecial) {
          total += complement.price;
        }
      });
      setTotalPrice(total);
    }
  }, [selectedComplements, item, availableComplements]);

  const toggleComplement = (complementId: string) => {
    const newSelected = new Set(selectedComplements);
    if (newSelected.has(complementId)) {
      newSelected.delete(complementId);
    } else {
      newSelected.add(complementId);
    }
    setSelectedComplements(newSelected);
  };

  const handleConfirm = () => {
    if (!item) return;
    
    const selected = availableComplements.filter((c) =>
      selectedComplements.has(c.id)
    );
    
    onConfirm(selected, totalPrice, observations.trim() || undefined);
    setSelectedComplements(new Set());
    setObservations("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedComplements(new Set());
    setObservations("");
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complementos - {item.name}</DialogTitle>
          <DialogDescription>
            {loading 
              ? "Carregando complementos..." 
              : "Selecione os complementos desejados. Complementos especiais têm custo adicional."
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : availableComplements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum complemento vinculado a este produto.
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
          {/* Complementos Grátis */}
          {freeComplements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Complementos Inclusos
                  <Badge variant="secondary">Grátis</Badge>
                </h3>
                {item && (item.name.toLowerCase().includes("disco") || item.name.toLowerCase().includes("tradicional")) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allFreeIds = freeComplements.map(c => c.id);
                      const allSelected = allFreeIds.every(id => selectedComplements.has(id));
                      const newSelected = new Set(selectedComplements);
                      if (allSelected) {
                        allFreeIds.forEach(id => newSelected.delete(id));
                      } else {
                        allFreeIds.forEach(id => newSelected.add(id));
                      }
                      setSelectedComplements(newSelected);
                    }}
                  >
                    {freeComplements.every(c => selectedComplements.has(c.id)) ? "Desmarcar todos" : "Marcar todos"}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {freeComplements.map((complement) => (
                  <div
                    key={complement.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <Checkbox
                      id={complement.id}
                      checked={selectedComplements.has(complement.id)}
                      onCheckedChange={() => toggleComplement(complement.id)}
                    />
                    <label
                      htmlFor={complement.id}
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      {complement.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {freeComplements.length > 0 && specialComplements.length > 0 && (
            <Separator />
          )}

          {/* Complementos Especiais (pagos) */}
          {specialComplements.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Complementos Especiais
                <Badge variant="default">Adicional</Badge>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {specialComplements.map((complement) => (
                  <div
                    key={complement.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <Checkbox
                      id={complement.id}
                      checked={selectedComplements.has(complement.id)}
                      onCheckedChange={() => toggleComplement(complement.id)}
                    />
                    <label
                      htmlFor={complement.id}
                      className="flex-1 flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-sm font-medium leading-none">
                        {complement.name}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        +R$ {complement.price.toFixed(2)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="observations" className="text-base font-semibold">
            Observações
          </Label>
          <Textarea
            id="observations"
            placeholder="Ex: Sem cebola, bem passado, etc..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">
            {observations.length}/200 caracteres
          </p>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between py-2">
          <span className="text-lg font-semibold">Valor Total:</span>
          <span className="text-2xl font-bold text-primary">
            R$ {totalPrice.toFixed(2)}
          </span>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="min-w-32" disabled={loading}>
            Adicionar ao Pedido
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};