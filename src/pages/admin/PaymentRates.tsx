import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PaymentRates = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState({
    credito: 3.5,
    debito: 2.0,
  });

  useEffect(() => {
    const savedRates = localStorage.getItem("paymentRates");
    if (savedRates) {
      setRates(JSON.parse(savedRates));
    }
  }, []);

  const handleSave = () => {
    // TODO: Salvar no banco quando Lovable Cloud estiver ativo
    localStorage.setItem("paymentRates", JSON.stringify(rates));
    toast.success("Taxas de pagamento atualizadas com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Taxas de Pagamento</h1>
            <p className="text-muted-foreground">Configure as taxas das maquininhas de cartão</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
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
                Taxa descontada do valor que entra no caixa
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
                Taxa descontada do valor que entra no caixa
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Exemplo de Cálculo:</h3>
            <p className="text-sm text-muted-foreground">
              Cliente paga R$ 100,00 no crédito com taxa de {rates.credito}%:
            </p>
            <div className="space-y-1 mt-2">
              <p className="text-sm">Valor do pedido: <span className="font-medium">R$ 100,00</span></p>
              <p className="text-sm text-destructive">Taxa da maquininha: <span className="font-medium">- R$ {(100 * rates.credito / 100).toFixed(2)}</span></p>
              <p className="text-sm font-bold text-accent border-t pt-1">Entra no caixa: R$ {(100 - (100 * rates.credito / 100)).toFixed(2)}</p>
            </div>
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
