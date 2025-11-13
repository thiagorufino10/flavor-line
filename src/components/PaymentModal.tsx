import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, QrCode } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (paymentMethod: string, customerName: string) => void;
}

type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro" | null;

export const PaymentModal = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
}: PaymentModalProps) => {
  const [step, setStep] = useState<"payment" | "name">("payment");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const [customerName, setCustomerName] = useState("");
  const [finalAmount, setFinalAmount] = useState(totalAmount);

  const paymentMethods = [
    { id: "pix", name: "PIX", icon: QrCode },
    { id: "credito", name: "Crédito", icon: CreditCard },
    { id: "debito", name: "Débito", icon: CreditCard },
    { id: "dinheiro", name: "Dinheiro", icon: Banknote },
  ];

  const handlePaymentSelect = (method: PaymentMethod) => {
    setSelectedPayment(method);
    setFinalAmount(totalAmount);
    setStep("name");
  };

  const handleConfirm = () => {
    if (selectedPayment && customerName.trim()) {
      onConfirm(selectedPayment, customerName.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setStep("payment");
    setSelectedPayment(null);
    setCustomerName("");
    setFinalAmount(totalAmount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "payment" ? "Selecione a Forma de Pagamento" : "Nome do Cliente"}
          </DialogTitle>
        </DialogHeader>

        {step === "payment" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handlePaymentSelect(method.id as PaymentMethod)}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="font-semibold">{method.name}</span>
                  </Button>
                );
              })}
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Valor do Pedido:</p>
              <p className="text-2xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              {(selectedPayment === "credito" || selectedPayment === "debito") && (() => {
                const rates = JSON.parse(localStorage.getItem("paymentRates") || '{"credito": 3.5, "debito": 2.0}');
                const rate = selectedPayment === "credito" ? rates.credito : rates.debito;
                const taxAmount = totalAmount * rate / 100;
                
                // Para crédito: adiciona taxa (cliente paga mais)
                // Para débito: subtrai taxa (entra menos no caixa)
                const clientPays = selectedPayment === "credito" ? totalAmount + taxAmount : totalAmount;
                const amountReceived = selectedPayment === "credito" ? clientPays : totalAmount - taxAmount;
                
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor do pedido:</span>
                      <span className="font-medium">R$ {totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Taxa {selectedPayment === "credito" ? "crédito" : "débito"} ({rate}%):</span>
                      <span className="font-medium text-destructive">{selectedPayment === "credito" ? "+" : "-"} R$ {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-semibold">Cliente paga:</span>
                      <span className="text-xl font-bold text-primary">R$ {clientPays.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-sm">Entra no caixa:</span>
                      <span className="text-sm font-medium">R$ {amountReceived.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
              {(selectedPayment === "pix" || selectedPayment === "dinheiro") && (
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente</Label>
              <Input
                id="customerName"
                placeholder="Ex: João Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customerName.trim()) {
                    handleConfirm();
                  }
                }}
                autoFocus
              />
            </div>

            <Button 
              className="w-full h-12 text-lg"
              onClick={handleConfirm}
              disabled={!customerName.trim()}
            >
              Finalizar Pedido
            </Button>
          </div>
        )}

        <DialogFooter>
          {step === "name" && (
            <Button variant="outline" onClick={() => {
              setStep("payment");
              setCustomerName("");
            }}>
              Voltar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
