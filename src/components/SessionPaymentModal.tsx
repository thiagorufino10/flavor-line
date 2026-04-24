import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, QrCode } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

interface SessionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number; // valor restante a pagar
  onConfirm: (method: string, amount: number, netAmount: number) => void;
}

const methods = [
  { id: "pix", name: "PIX", icon: QrCode },
  { id: "credito", name: "Crédito", icon: CreditCard },
  { id: "debito", name: "Débito", icon: CreditCard },
  { id: "dinheiro", name: "Dinheiro", icon: Banknote },
];

export const SessionPaymentModal = ({ open, onOpenChange, remaining, onConfirm }: SessionPaymentModalProps) => {
  const [step, setStep] = useState<"method" | "amount">("method");
  const [method, setMethod] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [rate, setRate] = useState(0);
  const [clientPaysFee, setClientPaysFee] = useState(true);

  useEffect(() => {
    if (!open) {
      setStep("method"); setMethod(null); setAmountStr("");
    } else {
      setAmountStr(remaining.toFixed(2));
    }
  }, [open, remaining]);

  useEffect(() => {
    (async () => {
      if (!method || (method !== "credito" && method !== "debito")) {
        setRate(0); return;
      }
      const { data: rateData } = await supabase
        .from("payment_rates").select("rate_percentage").eq("payment_method", method).maybeSingle();
      setRate(rateData ? parseFloat(String(rateData.rate_percentage)) : 0);
      const { data: payerData } = await supabase
        .from("system_settings").select("value").eq("key", `tax_payer_${method}`).maybeSingle();
      const cp = (payerData?.value || (method === "credito" ? "cliente" : "estabelecimento")) === "cliente";
      setClientPaysFee(cp);
    })();
  }, [method]);

  const baseAmount = parseFloat(amountStr) || 0;
  const taxAmount = (method === "credito" || method === "debito") ? baseAmount * rate / 100 : 0;
  const grossAmount = clientPaysFee ? baseAmount + taxAmount : baseAmount;
  const netAmount = clientPaysFee ? baseAmount : baseAmount - taxAmount;

  const handleConfirm = () => {
    if (!method || baseAmount <= 0) return;
    onConfirm(method, grossAmount, netAmount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "method" ? "Forma do pagamento" : "Valor"}</DialogTitle>
        </DialogHeader>

        {step === "method" && (
          <div className="space-y-3">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Restante na conta:</p>
              <p className="text-2xl font-bold text-primary">{formatBRL(remaining)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <Button
                    key={m.id}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => { setMethod(m.id); setStep("amount"); }}
                  >
                    <Icon className="w-7 h-7" />
                    <span className="font-semibold">{m.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {step === "amount" && method && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor base do pagamento</Label>
              <Input
                type="number" step="0.01" min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Você pode pagar parcial (menor que o restante) ou cobrir o total.
              </p>
            </div>

            {(method === "credito" || method === "debito") && rate > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Taxa ({rate}%):</span>
                  <span>{formatBRL(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Cliente paga:</span>
                  <span className="text-primary">{formatBRL(grossAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Entra no caixa:</span>
                  <span>{formatBRL(netAmount)}</span>
                </div>
              </div>
            )}

            <Button className="w-full h-12 text-lg" onClick={handleConfirm} disabled={baseAmount <= 0}>
              Registrar pagamento
            </Button>
          </div>
        )}

        <DialogFooter>
          {step === "amount" && (
            <Button variant="outline" onClick={() => setStep("method")}>Voltar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
