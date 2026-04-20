import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

const PaymentRates = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState({
    credito: 3.5,
    debito: 2.0,
  });
  // true = cliente paga, false = estabelecimento paga
  const [taxPayer, setTaxPayer] = useState({
    credito: true,
    debito: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const [ratesRes, settingsRes] = await Promise.all([
        supabase.from("payment_rates").select("*").in("payment_method", ["credito", "debito"]),
        supabase.from("system_settings").select("*").in("key", ["tax_payer_credito", "tax_payer_debito"]),
      ]);

      if (ratesRes.error) throw ratesRes.error;
      if (settingsRes.error) throw settingsRes.error;

      if (ratesRes.data && ratesRes.data.length > 0) {
        const ratesMap: any = {};
        ratesRes.data.forEach(rate => {
          ratesMap[rate.payment_method] = parseFloat(String(rate.rate_percentage));
        });
        setRates({
          credito: ratesMap.credito || 3.5,
          debito: ratesMap.debito || 2.0,
        });
      }

      if (settingsRes.data) {
        const settingsMap: Record<string, string> = {};
        settingsRes.data.forEach(s => { settingsMap[s.key] = s.value; });
        setTaxPayer({
          credito: settingsMap.tax_payer_credito !== "estabelecimento",
          debito: settingsMap.tax_payer_debito !== "estabelecimento",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar taxas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { getClientId } = await import("@/lib/getClientId");
      const client_id = await getClientId();

      const { error: creditoError } = await supabase
        .from("payment_rates")
        .upsert({ client_id, payment_method: "credito", rate_percentage: rates.credito }, { onConflict: "client_id,payment_method" });
      if (creditoError) throw creditoError;

      const { error: debitoError } = await supabase
        .from("payment_rates")
        .upsert({ client_id, payment_method: "debito", rate_percentage: rates.debito }, { onConflict: "client_id,payment_method" });
      if (debitoError) throw debitoError;

      // Salvar quem paga a taxa
      for (const method of ["credito", "debito"] as const) {
        const value = taxPayer[method] ? "cliente" : "estabelecimento";
        const { error } = await supabase
          .from("system_settings")
          .upsert({ client_id, key: `tax_payer_${method}`, value }, { onConflict: "client_id,key" });
        if (error) throw error;
      }

      localStorage.setItem("paymentRates", JSON.stringify(rates));
      localStorage.setItem("taxPayer", JSON.stringify({
        credito: taxPayer.credito ? "cliente" : "estabelecimento",
        debito: taxPayer.debito ? "cliente" : "estabelecimento",
      }));
      
      toast.success("Taxas de pagamento atualizadas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar taxas:", error);
      toast.error("Erro ao salvar taxas de pagamento");
    }
  };

  const exampleTotal = 100;
  const exampleRate = rates.credito;
  const exampleTax = exampleTotal * exampleRate / 100;
  const exampleClientPays = taxPayer.credito ? exampleTotal + exampleTax : exampleTotal;
  const exampleCaixa = taxPayer.credito ? exampleTotal : exampleTotal - exampleTax;

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
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Crédito */}
                <div className="space-y-4 p-4 border rounded-lg">
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
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Quem paga a taxa?</Label>
                      <p className="text-sm text-muted-foreground">
                        {taxPayer.credito ? "Cliente paga (soma ao total)" : "Estabelecimento paga (subtrai do caixa)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Eu</span>
                      <Switch
                        checked={taxPayer.credito}
                        onCheckedChange={(checked) => setTaxPayer({ ...taxPayer, credito: checked })}
                      />
                      <span className="text-xs text-muted-foreground">Cliente</span>
                    </div>
                  </div>
                </div>

                {/* Débito */}
                <div className="space-y-4 p-4 border rounded-lg">
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
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Quem paga a taxa?</Label>
                      <p className="text-sm text-muted-foreground">
                        {taxPayer.debito ? "Cliente paga (soma ao total)" : "Estabelecimento paga (subtrai do caixa)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Eu</span>
                      <Switch
                        checked={taxPayer.debito}
                        onCheckedChange={(checked) => setTaxPayer({ ...taxPayer, debito: checked })}
                      />
                      <span className="text-xs text-muted-foreground">Cliente</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Exemplo de Cálculo (Crédito):</h3>
                <p className="text-sm text-muted-foreground">
                  Pedido de{formatBRL(exampleTotal)} no crédito com taxa de {rates.credito}%:
                </p>
                <div className="space-y-1 mt-2">
                  <p className="text-sm">Valor do pedido: <span className="font-medium">{formatBRL(exampleTotal)}</span></p>
                  <p className="text-sm text-destructive">
                    Taxa da maquininha ({taxPayer.credito ? "cliente paga" : "você paga"}): 
                    <span className="font-medium"> {taxPayer.credito ? "+" : "-"}{formatBRL(exampleTax)}</span>
                  </p>
                  <p className="text-sm">Cliente paga: <span className="font-medium">{formatBRL(exampleClientPays)}</span></p>
                  <p className="text-sm font-bold text-accent border-t pt-1">Entra no caixa:{formatBRL(exampleCaixa)}</p>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full md:w-auto" disabled={loading}>
                Salvar Taxas
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentRates;
