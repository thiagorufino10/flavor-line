import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
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
import { formatBRL } from "@/lib/format";

export interface Complement {
  id: string;
  name: string;
  price: number;
  category_id: string;
  isSpecial: boolean;
}

interface ComplementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    price: number;
    category_id: string;
  } | null;
  prefetchedComplements?: { id: string; name: string; price: number; category_id: string }[];
  onConfirm: (
    selectedComplements: Complement[],
    totalPrice: number,
    observations?: string,
    quantity?: number,
  ) => void;
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
  const [observations, setObservations] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item && open && prefetchedComplements) {
      const formatted = prefetchedComplements.map((comp) => ({
        id: comp.id,
        name: comp.name,
        price: comp.price,
        category_id: comp.category_id,
        isSpecial: comp.price > 0,
      }));
      setAvailableComplements(formatted);
    }
  }, [item, open, prefetchedComplements]);

  const freeComplements = availableComplements.filter((c) => !c.isSpecial);
  const specialComplements = availableComplements.filter((c) => c.isSpecial);

  const getItemPriceByComplements = (itemName: string, basePrice: number, complementCount: number): number => {
    const nameLower = itemName.toLowerCase();
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
      selectedComplements.forEach((complementId) => {
        const complement = availableComplements.find((c) => c.id === complementId);
        if (complement && complement.isSpecial) total += complement.price;
      });
      setTotalPrice(total);
    }
  }, [selectedComplements, item, availableComplements]);

  const toggleComplement = (complementId: string) => {
    const newSelected = new Set(selectedComplements);
    if (newSelected.has(complementId)) newSelected.delete(complementId);
    else newSelected.add(complementId);
    setSelectedComplements(newSelected);
  };

  const handleConfirm = () => {
    if (!item) return;
    const selected = availableComplements.filter((c) => selectedComplements.has(c.id));
    onConfirm(selected, totalPrice, observations.trim() || undefined, quantity);
    setSelectedComplements(new Set());
    setObservations("");
    setQuantity(1);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedComplements(new Set());
    setObservations("");
    setQuantity(1);
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complementos - {item.name}</DialogTitle>
          <DialogDescription>
            Selecione os complementos desejados. Complementos especiais têm custo adicional.
          </DialogDescription>
        </DialogHeader>

        {availableComplements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum complemento vinculado a este produto.
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {freeComplements.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Complementos Inclusos
                      <Badge variant="secondary">Grátis</Badge>
                    </h3>
                    {item &&
                      (item.name.toLowerCase().includes("disco") ||
                        item.name.toLowerCase().includes("tradicional")) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allFreeIds = freeComplements.map((c) => c.id);
                            const allSelected = allFreeIds.every((id) => selectedComplements.has(id));
                            const newSelected = new Set(selectedComplements);
                            if (allSelected) allFreeIds.forEach((id) => newSelected.delete(id));
                            else allFreeIds.forEach((id) => newSelected.add(id));
                            setSelectedComplements(newSelected);
                          }}
                        >
                          {freeComplements.every((c) => selectedComplements.has(c.id))
                            ? "Desmarcar todos"
                            : "Marcar todos"}
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

              {freeComplements.length > 0 && specialComplements.length > 0 && <Separator />}

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
                          <span className="text-sm font-medium leading-none">{complement.name}</span>
                          <span className="text-sm font-bold text-primary">+{formatBRL(complement.price)}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

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
              <p className="text-xs text-muted-foreground text-right">{observations.length}/200 caracteres</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <span className="text-lg font-semibold">Quantidade:</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <span className="text-lg font-semibold">Valor Total:</span>
              <span className="text-2xl font-bold text-primary">{formatBRL(totalPrice * quantity)}</span>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="min-w-32">
                Adicionar ao Pedido
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
