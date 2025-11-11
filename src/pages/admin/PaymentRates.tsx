import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

const PaymentRates = () => {
  const [rates, setRates] = useState({
    credito: 3.5,
    debito: 2.0,
  });

  const handleSave = () => {
    // TODO: Salvar no banco quando Lovable Cloud estiver ativo
    localStorage.setItem("paymentRates", JSON.stringify(rates));
    toast.success("Taxas de pagamento atualizadas com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Taxas de Pagamento</h1>
          <p className="text-muted-foreground">Configure as taxas das maquininhas de cartão</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Taxas (%)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credito">Taxa Cartão de Crédito (%)</Label>
              <Input
                id="credito"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={rates.credito}
                onChange={(e) => setRates({ ...rates, credito: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-sm text-muted-foreground">
                Taxa aplicada sobre o valor total do pedido
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debito">Taxa Cartão de Débito (%)</Label>
              <Input
                id="debito"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={rates.debito}
                onChange={(e) => setRates({ ...rates, debito: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-sm text-muted-foreground">
                Taxa aplicada sobre o valor total do pedido
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Exemplo de Cálculo:</h3>
            <p className="text-sm text-muted-foreground">
              Pedido de R$ 100,00 com taxa de crédito de {rates.credito}%:
            </p>
            <p className="text-sm font-medium">
              Valor Final: R$ {(100 + (100 * rates.credito / 100)).toFixed(2)}
            </p>
          </div>

          <Button onClick={handleSave} className="w-full md:w-auto">
            Salvar Taxas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentRates;
