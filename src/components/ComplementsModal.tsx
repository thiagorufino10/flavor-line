import { useState, useEffect } from "react";
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

export interface Complement {
  id: string;
  name: string;
  price: number;
  category: "pasteis" | "salgados" | "acai";
  isSpecial: boolean; // Se true, cobra valor adicional
}

interface ComplementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    name: string;
    price: number;
    category: "pasteis" | "salgados" | "acai";
  } | null;
  onConfirm: (selectedComplements: Complement[], totalPrice: number) => void;
}

// Mock de complementos - depois virá do banco de dados
const mockComplements: Complement[] = [
  // Pastéis
  { id: "1", name: "Ketchup", price: 0, category: "pasteis", isSpecial: false },
  { id: "2", name: "Mostarda", price: 0, category: "pasteis", isSpecial: false },
  { id: "3", name: "Maionese", price: 0, category: "pasteis", isSpecial: false },
  { id: "4", name: "Batata Frita", price: 5.00, category: "pasteis", isSpecial: true },
  { id: "5", name: "Queijo Extra", price: 3.00, category: "pasteis", isSpecial: true },
  
  // Salgados
  { id: "6", name: "Ketchup", price: 0, category: "salgados", isSpecial: false },
  { id: "7", name: "Mostarda", price: 0, category: "salgados", isSpecial: false },
  { id: "8", name: "Maionese", price: 0, category: "salgados", isSpecial: false },
  
  // Açaí
  { id: "9", name: "Leite em Pó", price: 2.00, category: "acai", isSpecial: true },
  { id: "10", name: "Granola", price: 2.00, category: "acai", isSpecial: true },
  { id: "11", name: "Paçoca", price: 2.50, category: "acai", isSpecial: true },
  { id: "12", name: "Morango", price: 3.00, category: "acai", isSpecial: true },
  { id: "13", name: "Banana", price: 1.50, category: "acai", isSpecial: true },
];

export const ComplementsModal = ({
  open,
  onOpenChange,
  item,
  onConfirm,
}: ComplementsModalProps) => {
  const [selectedComplements, setSelectedComplements] = useState<Set<string>>(new Set());
  const [totalPrice, setTotalPrice] = useState(0);

  // Filtrar complementos pela categoria do item
  const availableComplements = item
    ? mockComplements.filter((c) => c.category === item.category)
    : [];

  const freeComplements = availableComplements.filter((c) => !c.isSpecial);
  const specialComplements = availableComplements.filter((c) => c.isSpecial);

  useEffect(() => {
    if (item) {
      // Calcular preço total
      let total = item.price;
      selectedComplements.forEach((complementId) => {
        const complement = availableComplements.find((c) => c.id === complementId);
        if (complement && complement.isSpecial) {
          total += complement.price;
        }
      });
      setTotalPrice(total);
    }
  }, [selectedComplements, item]);

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
    
    onConfirm(selected, totalPrice);
    setSelectedComplements(new Set());
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedComplements(new Set());
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

        <div className="space-y-6 py-4">
          {/* Complementos Grátis */}
          {freeComplements.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Complementos Inclusos
                <Badge variant="secondary">Grátis</Badge>
              </h3>
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
          <Button onClick={handleConfirm} className="min-w-32">
            Adicionar ao Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
