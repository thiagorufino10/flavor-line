import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { LogOut, Printer, Monitor, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const OperationMode = () => {
  const navigate = useNavigate();
  const [operationMode, setOperationMode] = useState<"printer" | "display" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMode = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "operation_mode")
        .maybeSingle();
      if (data && (data.value === "printer" || data.value === "display")) {
        setOperationMode(data.value);
      }
      setLoading(false);
    };
    fetchMode();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "operation_mode", value: operationMode, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
      toast.error("Erro ao salvar modo de operação");
      return;
    }
    toast.success("Modo de operação salvo com sucesso!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Modo de Operação</h1>
              <p className="text-sm text-muted-foreground">Configure como os pedidos são enviados</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Escolha o Modo de Operação</CardTitle>
            <CardDescription>
              Selecione como deseja que os pedidos sejam enviados para a cozinha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
            <RadioGroup value={operationMode || "display"} onValueChange={(value) => setOperationMode(value as "printer" | "display")}>
              {/* Modo Impressão */}
              <Card className={`cursor-pointer transition-all ${operationMode === "printer" ? "border-primary border-2 shadow-md" : "hover:border-muted-foreground/30"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="printer" id="printer" />
                    <div className="flex-1">
                      <Label htmlFor="printer" className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                            <Printer className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Modo Impressão</h3>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground ml-13">
                          Os pedidos serão enviados automaticamente para a impressora térmica configurada na cozinha.
                        </p>
                        <div className="mt-3 ml-13 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Características:</p>
                          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Comandas impressas automaticamente</li>
                            <li>KDS e Display do Cliente ficam desativados</li>
                            <li>Ideal para operação tradicional</li>
                          </ul>
                        </div>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modo Display */}
              <Card className={`cursor-pointer transition-all ${operationMode === "display" ? "border-primary border-2 shadow-md" : "hover:border-muted-foreground/30"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value="display" id="display" />
                    <div className="flex-1">
                      <Label htmlFor="display" className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Modo Display Digital</h3>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground ml-13">
                          Os pedidos aparecem nas telas de KDS e Display do Cliente em tempo real.
                        </p>
                        <div className="mt-3 ml-13 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Características:</p>
                          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>KDS para gerenciamento da cozinha</li>
                            <li>Display do Cliente mostra pedidos prontos</li>
                            <li>Impressora desativada</li>
                            <li>Ideal para operação moderna e digital</li>
                          </ul>
                        </div>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>

            <div className="flex justify-end">
              <Button onClick={handleSave} size="lg">
                Salvar Configuração
              </Button>
            </div>
            </>
          )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OperationMode;
