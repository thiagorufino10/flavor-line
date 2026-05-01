import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, QrCode, Split } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

interface SinglePayment {
  method: string;
  amount: number;     // valor cobrado do cliente (gross)
  netAmount: number;  // valor que entra no caixa (net)
}

interface SessionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
  /** Mantém compatibilidade: chamado uma vez por pagamento (único OU para cada parcela do split). */
  onConfirm: (method: string, amount: number, netAmount: number) => void | Promise<void>;
}

const methods = [
  { id: "pix", name: "PIX", icon: QrCode },
  { id: "credito", name: "Crédito", icon: CreditCard },
  { id: "debito", name: "Débito", icon: CreditCard },
  { id: "dinheiro", name: "Dinheiro", icon: Banknote },
];

const methodLabel: Record<string, string> = {
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
};

type Step = "mode" | "single-method" | "single-amount" | "split-method1" | "split-method2" | "split-amounts";

interface RateConfig {
  rate: number;
  clientPaysFee: boolean;
}

export const SessionPaymentModal = ({ open, onOpenChange, remaining, onConfirm }: SessionPaymentModalProps) => {
  const [step, setStep] = useState<Step>("mode");
  const [singleMethod, setSingleMethod] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("");

  const [splitMethod1, setSplitMethod1] = useState<string | null>(null);
  const [splitMethod2, setSplitMethod2] = useState<string | null>(null);
  const [splitAmount1, setSplitAmount1] = useState("");
  const [splitAmount2, setSplitAmount2] = useState("");

  const [rates, setRates] = useState<Record<string, RateConfig>>({});

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setStep("mode");
      setSingleMethod(null);
      setAmountStr("");
      setSplitMethod1(null);
      setSplitMethod2(null);
      setSplitAmount1("");
      setSplitAmount2("");
    } else {
      setAmountStr(remaining.toFixed(2));
    }
  }, [open, remaining]);

  // Carrega taxas/configurações dos métodos com taxa
  useEffect(() => {
    (async () => {
      const cardMethods = ["credito", "debito"];
      const result: Record<string, RateConfig> = {};
      for (const m of cardMethods) {
        const { data: rateData } = await supabase
          .from("payment_rates").select("rate_percentage").eq("payment_method", m).maybeSingle();
        const rate = rateData ? parseFloat(String(rateData.rate_percentage)) : 0;
        const { data: payerData } = await supabase
          .from("system_settings").select("value").eq("key", `tax_payer_${m}`).maybeSingle();
        const cp = (payerData?.value || (m === "credito" ? "cliente" : "estabelecimento")) === "cliente";
        result[m] = { rate, clientPaysFee: cp };
      }
      setRates(result);
    })();
  }, [open]);

  const computePayment = (method: string, baseAmount: number): SinglePayment => {
    const cfg = rates[method];
    if (!cfg || (method !== "credito" && method !== "debito") || !cfg.rate) {
      return { method, amount: baseAmount, netAmount: baseAmount };
    }
    const taxAmount = baseAmount * cfg.rate / 100;
    const gross = cfg.clientPaysFee ? baseAmount + taxAmount : baseAmount;
    const net = cfg.clientPaysFee ? baseAmount : baseAmount - taxAmount;
    return { method, amount: gross, netAmount: net };
  };

  // Quando muda o split1, recalcula split2 (auto-complete)
  useEffect(() => {
    if (step === "split-amounts" && splitAmount1 !== "") {
      const a1 = parseFloat(splitAmount1) || 0;
      const r = Math.max(0, remaining - a1);
      setSplitAmount2(r.toFixed(2));
    }
  }, [splitAmount1, remaining, step]);

  const handleSingleConfirm = () => {
    const base = parseFloat(amountStr) || 0;
    if (!singleMethod || base <= 0) return;
    const p = computePayment(singleMethod, base);
    onConfirm(p.method, p.amount, p.netAmount);
    onOpenChange(false);
  };

  const handleSplitConfirm = () => {
    if (!splitMethod1 || !splitMethod2) return;
    const a1 = parseFloat(splitAmount1) || 0;
    const a2 = parseFloat(splitAmount2) || 0;
    if (a1 <= 0 || a2 <= 0) return;
    const p1 = computePayment(splitMethod1, a1);
    const p2 = computePayment(splitMethod2, a2);
    // Registra duas parcelas separadas (cada uma vira uma linha em session_payments)
    onConfirm(p1.method, p1.amount, p1.netAmount);
    onConfirm(p2.method, p2.amount, p2.netAmount);
    onOpenChange(false);
  };

  // ---------- Cálculos auxiliares ----------
  const baseAmount = parseFloat(amountStr) || 0;
  const singlePreview = singleMethod ? computePayment(singleMethod, baseAmount) : null;

  const splitValid = (() => {
    const a1 = parseFloat(splitAmount1) || 0;
    const a2 = parseFloat(splitAmount2) || 0;
    return a1 > 0 && a2 > 0 && Math.abs(a1 + a2 - remaining) < 0.01;
  })();

  const goBack = () => {
    if (step === "single-amount") setStep("single-method");
    else if (step === "single-method") setStep("mode");
    else if (step === "split-method1") setStep("mode");
    else if (step === "split-method2") setStep("split-method1");
    else if (step === "split-amounts") setStep("split-method2");
  };

  const renderTitle = () => {
    switch (step) {
      case "mode": return "Forma de Pagamento";
      case "single-method": return "Selecione o pagamento";
      case "single-amount": return "Valor";
      case "split-method1": return "1ª Forma de Pagamento";
      case "split-method2": return "2ª Forma de Pagamento";
      case "split-amounts": return "Dividir o valor";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{renderTitle()}</DialogTitle>
        </DialogHeader>

        {/* ---------- ESCOLHA: ÚNICO OU DIVIDIDO ---------- */}
        {step === "mode" && (
          <div className="space-y-3">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Restante na conta:</p>
              <p className="text-2xl font-bold text-primary">{formatBRL(remaining)}</p>
            </div>
            <Button
              variant="outline"
              className="w-full h-16 text-lg gap-3"
              onClick={() => setStep("single-method")}
            >
              <CreditCard className="w-6 h-6" />
              Pagamento Único
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 text-lg gap-3"
              onClick={() => setStep("split-method1")}
            >
              <Split className="w-6 h-6" />
              Dividir em 2 Formas
            </Button>
          </div>
        )}

        {/* ---------- PAGAMENTO ÚNICO: MÉTODO ---------- */}
        {step === "single-method" && (
          <div className="grid grid-cols-2 gap-3">
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <Button
                  key={m.id}
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => { setSingleMethod(m.id); setStep("single-amount"); }}
                >
                  <Icon className="w-7 h-7" />
                  <span className="font-semibold">{m.name}</span>
                </Button>
              );
            })}
          </div>
        )}

        {/* ---------- PAGAMENTO ÚNICO: VALOR ---------- */}
        {step === "single-amount" && singleMethod && (
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

            {singlePreview && (singleMethod === "credito" || singleMethod === "debito") && rates[singleMethod]?.rate > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Taxa ({rates[singleMethod].rate}%):</span>
                  <span>{formatBRL(singlePreview.amount - singlePreview.netAmount > 0 ? singlePreview.amount - baseAmount : baseAmount - singlePreview.netAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Cliente paga:</span>
                  <span className="text-primary">{formatBRL(singlePreview.amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Entra no caixa:</span>
                  <span>{formatBRL(singlePreview.netAmount)}</span>
                </div>
              </div>
            )}

            <Button className="w-full h-12 text-lg" onClick={handleSingleConfirm} disabled={baseAmount <= 0}>
              Registrar pagamento
            </Button>
          </div>
        )}

        {/* ---------- DIVIDIDO: MÉTODO 1 ---------- */}
        {step === "split-method1" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Selecione a primeira forma de pagamento
            </p>
            <div className="grid grid-cols-2 gap-3">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <Button
                    key={m.id}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => { setSplitMethod1(m.id); setStep("split-method2"); }}
                  >
                    <Icon className="w-7 h-7" />
                    <span className="font-semibold">{m.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- DIVIDIDO: MÉTODO 2 ---------- */}
        {step === "split-method2" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              1ª forma: <strong>{methodLabel[splitMethod1 || ""]}</strong> — agora a segunda
            </p>
            <div className="grid grid-cols-2 gap-3">
              {methods
                .filter((m) => m.id !== splitMethod1)
                .map((m) => {
                  const Icon = m.icon;
                  return (
                    <Button
                      key={m.id}
                      variant="outline"
                      className="h-24 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground"
                      onClick={() => {
                        setSplitMethod2(m.id);
                        setSplitAmount1((remaining / 2).toFixed(2));
                        setSplitAmount2((remaining - remaining / 2).toFixed(2));
                        setStep("split-amounts");
                      }}
                    >
                      <Icon className="w-7 h-7" />
                      <span className="font-semibold">{m.name}</span>
                    </Button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ---------- DIVIDIDO: VALORES ---------- */}
        {step === "split-amounts" && splitMethod1 && splitMethod2 && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total a dividir</p>
              <p className="text-xl font-bold text-primary">{formatBRL(remaining)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{methodLabel[splitMethod1]}</Label>
                <Input
                  type="number" step="0.01" min="0.01" max={remaining}
                  value={splitAmount1}
                  onChange={(e) => setSplitAmount1(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">{methodLabel[splitMethod2]}</Label>
                <Input
                  type="number" step="0.01" min="0.01"
                  value={splitAmount2}
                  onChange={(e) => {
                    setSplitAmount2(e.target.value);
                    const a2 = parseFloat(e.target.value) || 0;
                    setSplitAmount1(Math.max(0, remaining - a2).toFixed(2));
                  }}
                />
              </div>
              {!splitValid && (
                <p className="text-xs text-destructive">
                  A soma dos valores deve ser igual a {formatBRL(remaining)}
                </p>
              )}
            </div>

            <Button className="w-full h-12 text-lg" onClick={handleSplitConfirm} disabled={!splitValid}>
              Registrar pagamentos
            </Button>
          </div>
        )}

        <DialogFooter>
          {step !== "mode" && (
            <Button variant="outline" onClick={goBack}>Voltar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
