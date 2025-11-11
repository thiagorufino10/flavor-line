import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, QrCode, Printer, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (paymentMethod: string, destination: "kitchen" | "printer") => void;
}

type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro" | null;
type Destination = "kitchen" | "printer" | null;

export const PaymentModal = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
}: PaymentModalProps) => {
  const [step, setStep] = useState<"payment" | "destination">("payment");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
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
    setStep("destination");
  };

  const handleDestinationSelect = (destination: Destination) => {
    if (selectedPayment && destination) {
      onConfirm(selectedPayment, destination);
      handleClose();
    }
  };

  const handleClose = () => {
    setStep("payment");
    setSelectedPayment(null);
    setFinalAmount(totalAmount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "payment" ? "Selecione a Forma de Pagamento" : "Destino do Pedido"}
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
                const amountReceived = totalAmount - taxAmount;
                
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor do pedido:</span>
                      <span className="font-medium">R$ {totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Taxa maquininha ({rate}%):</span>
                      <span className="font-medium text-destructive">- R$ {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-semibold">Cliente paga:</span>
                      <span className="text-xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-sm">Entra no caixa:</span>
                      <span className="text-sm font-medium">R$ {amountReceived.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
              {(selectedPayment === "pix" || selectedPayment === "dinheiro") && (
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-center">Enviar pedido para:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleDestinationSelect("kitchen")}
                >
                  <Monitor className="w-8 h-8" />
                  <span className="font-semibold">Tela da Cozinha</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleDestinationSelect("printer")}
                >
                  <Printer className="w-8 h-8" />
                  <span className="font-semibold">Imprimir</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "destination" && (
            <Button variant="outline" onClick={() => setStep("payment")}>
              Voltar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
