import { useState, useEffect } from "react";
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
import { CreditCard, Banknote, QrCode, Split } from "lucide-react";

export interface SplitPaymentInfo {
  method: string;
  amount: number;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (paymentMethod: string, customerName: string, splitPayments?: SplitPaymentInfo[]) => void;
}

type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro";

const paymentMethods = [
  { id: "pix" as PaymentMethod, name: "PIX", icon: QrCode },
  { id: "credito" as PaymentMethod, name: "Crédito", icon: CreditCard },
  { id: "debito" as PaymentMethod, name: "Débito", icon: CreditCard },
  { id: "dinheiro" as PaymentMethod, name: "Dinheiro", icon: Banknote },
];

const methodLabel: Record<string, string> = {
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

type Step = "mode" | "payment" | "split1" | "split2" | "name";

export const PaymentModal = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
}: PaymentModalProps) => {
  const [step, setStep] = useState<Step>("mode");
  const [isSplit, setIsSplit] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [splitMethod1, setSplitMethod1] = useState<PaymentMethod | null>(null);
  const [splitMethod2, setSplitMethod2] = useState<PaymentMethod | null>(null);
  const [splitAmount1, setSplitAmount1] = useState("");
  const [splitAmount2, setSplitAmount2] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Auto-calculate second amount when first changes
  useEffect(() => {
    if (step === "split2" && splitAmount1) {
      const a1 = parseFloat(splitAmount1) || 0;
      const remaining = Math.max(0, totalAmount - a1);
      setSplitAmount2(remaining.toFixed(2));
    }
  }, [splitAmount1, totalAmount, step]);

  const handleSinglePayment = (method: PaymentMethod) => {
    setSelectedPayment(method);
    setIsSplit(false);
    setStep("name");
  };

  const handleSplitSelect1 = (method: PaymentMethod) => {
    setSplitMethod1(method);
    setStep("split2");
  };

  const handleSplitSelect2 = (method: PaymentMethod) => {
    setSplitMethod2(method);
    setSplitAmount1("");
    setSplitAmount2("");
    setStep("name");
  };

  const handleConfirm = () => {
    if (!customerName.trim()) return;

    if (isSplit && splitMethod1 && splitMethod2) {
      const a1 = parseFloat(splitAmount1) || 0;
      const a2 = parseFloat(splitAmount2) || 0;
      const combinedMethod = `${splitMethod1}/${splitMethod2}`;
      onConfirm(combinedMethod, customerName.trim(), [
        { method: splitMethod1, amount: a1 },
        { method: splitMethod2, amount: a2 },
      ]);
    } else if (selectedPayment) {
      onConfirm(selectedPayment, customerName.trim());
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("mode");
    setIsSplit(false);
    setSelectedPayment(null);
    setSplitMethod1(null);
    setSplitMethod2(null);
    setSplitAmount1("");
    setSplitAmount2("");
    setCustomerName("");
    onOpenChange(false);
  };

  const goBack = () => {
    if (step === "name" && isSplit) setStep("split2");
    else if (step === "name") setStep("payment");
    else if (step === "split2") setStep("split1");
    else if (step === "split1" || step === "payment") setStep("mode");
    else setStep("mode");
  };

  const splitValid = () => {
    const a1 = parseFloat(splitAmount1) || 0;
    const a2 = parseFloat(splitAmount2) || 0;
    return Math.abs(a1 + a2 - totalAmount) < 0.01 && a1 > 0 && a2 > 0;
  };

  const getTaxInfo = (method: string) => {
    if (method !== "credito" && method !== "debito") return null;
    const rates = JSON.parse(localStorage.getItem("paymentRates") || '{"credito": 3.5, "debito": 2.0}');
    const taxPayerConfig = JSON.parse(localStorage.getItem("taxPayer") || '{"credito": "cliente", "debito": "estabelecimento"}');
    const rate = rates[method] || 0;
    const clientePaga = taxPayerConfig[method] === "cliente";
    return { rate, clientePaga };
  };

  const renderTitle = () => {
    switch (step) {
      case "mode": return "Forma de Pagamento";
      case "payment": return "Selecione o Pagamento";
      case "split1": return "1ª Forma de Pagamento";
      case "split2": return "2ª Forma de Pagamento";
      case "name": return "Nome do Cliente";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{renderTitle()}</DialogTitle>
        </DialogHeader>

        {step === "mode" && (
          <div className="space-y-3">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Valor do Pedido:</p>
              <p className="text-2xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</p>
            </div>
            <Button
              variant="outline"
              className="w-full h-16 text-lg gap-3"
              onClick={() => { setIsSplit(false); setStep("payment"); }}
            >
              <CreditCard className="w-6 h-6" />
              Pagamento Único
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 text-lg gap-3"
              onClick={() => { setIsSplit(true); setStep("split1"); }}
            >
              <Split className="w-6 h-6" />
              Dividir em 2 Formas
            </Button>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleSinglePayment(method.id)}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="font-semibold">{method.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {step === "split1" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Selecione a primeira forma de pagamento</p>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleSplitSelect1(method.id)}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="font-semibold">{method.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {step === "split2" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              1ª forma: <strong>{methodLabel[splitMethod1 || ""]}</strong> — Agora selecione a segunda
            </p>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods
                .filter((m) => m.id !== splitMethod1)
                .map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.id}
                      variant="outline"
                      className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleSplitSelect2(method.id)}
                    >
                      <Icon className="w-8 h-8" />
                      <span className="font-semibold">{method.name}</span>
                    </Button>
                  );
                })}
            </div>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            {/* Payment summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              {isSplit && splitMethod1 && splitMethod2 ? (
                <>
                  <div className="text-sm font-semibold mb-2">Dividir R$ {totalAmount.toFixed(2)}:</div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">{methodLabel[splitMethod1]}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={totalAmount}
                        value={splitAmount1}
                        onChange={(e) => setSplitAmount1(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{methodLabel[splitMethod2]}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={splitAmount2}
                        onChange={(e) => {
                          setSplitAmount2(e.target.value);
                          const a2 = parseFloat(e.target.value) || 0;
                          const remaining = Math.max(0, totalAmount - a2);
                          setSplitAmount1(remaining.toFixed(2));
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {!splitValid() && splitAmount1 && (
                    <p className="text-xs text-destructive">A soma dos valores deve ser igual a R$ {totalAmount.toFixed(2)}</p>
                  )}
                  {/* Tax info for split */}
                  {[{ method: splitMethod1, amount: parseFloat(splitAmount1) || 0 }, { method: splitMethod2, amount: parseFloat(splitAmount2) || 0 }].map(({ method, amount }) => {
                    const tax = getTaxInfo(method);
                    if (!tax || amount <= 0) return null;
                    const taxAmount = amount * tax.rate / 100;
                    return (
                      <div key={method} className="text-xs text-muted-foreground border-t pt-1 mt-1">
                        Taxa {methodLabel[method]} ({tax.rate}%): {tax.clientePaga ? "+" : "-"} R$ {taxAmount.toFixed(2)}
                        {tax.clientePaga ? ` (cliente paga R$ ${(amount + taxAmount).toFixed(2)})` : ` (entra R$ ${(amount - taxAmount).toFixed(2)})`}
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  {(selectedPayment === "credito" || selectedPayment === "debito") && (() => {
                    const tax = getTaxInfo(selectedPayment);
                    if (!tax) return null;
                    const taxAmount = totalAmount * tax.rate / 100;
                    const clientPays = tax.clientePaga ? totalAmount + taxAmount : totalAmount;
                    const amountReceived = tax.clientePaga ? totalAmount : totalAmount - taxAmount;
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Valor do pedido:</span>
                          <span className="font-medium">R$ {totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Taxa {methodLabel[selectedPayment]} ({tax.rate}%):</span>
                          <span className="font-medium text-destructive">{tax.clientePaga ? "+" : "-"} R$ {taxAmount.toFixed(2)}</span>
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
                </>
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
                  if (e.key === "Enter" && customerName.trim() && (!isSplit || splitValid())) {
                    handleConfirm();
                  }
                }}
                autoFocus={!isSplit}
              />
            </div>

            <Button
              className="w-full h-12 text-lg"
              onClick={handleConfirm}
              disabled={!customerName.trim() || (isSplit && !splitValid())}
            >
              Finalizar Pedido
            </Button>
          </div>
        )}

        <DialogFooter>
          {step !== "mode" && (
            <Button variant="outline" onClick={goBack}>
              Voltar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
