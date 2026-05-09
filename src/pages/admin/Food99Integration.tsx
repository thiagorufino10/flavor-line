import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Copy, ExternalLink, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useFood99Enabled } from "@/hooks/useFood99Enabled";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

const WEBHOOK_URL =
  "https://fficgvfnyfccynplhkyz.supabase.co/functions/v1/food99-webhook";

export default function Food99Integration() {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { enabled, loading } = useFood99Enabled();

  const [merchantId, setMerchantId] = useState("");
  const [storeToken, setStoreToken] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [saving, setSaving] = useState(false);
  const [credLoaded, setCredLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const syncMenu = async () => {
    setSyncing(true);
    setSyncResult(null);
    const { data, error } = await supabase.functions.invoke("food99-menu-sync", { body: {} });
    setSyncing(false);
    if (error) {
      toast.error("Falha: " + error.message);
      setSyncResult({ error: error.message });
      return;
    }
    setSyncResult(data);
    if (data?.dry_run) {
      toast.success(`Dry-run: ${data.items_count} itens prontos para envio`);
    } else if (data?.ok) {
      toast.success(`Cardápio sincronizado (${data.items_count} itens)`);
    } else {
      toast.error("Resposta com erro do 99Food");
    }
  };

  useEffect(() => {
    if (!clientId || !enabled) return;
    (async () => {
      const { data } = await supabase
        .from("food99_credentials" as any)
        .select("merchant_id, store_token, environment")
        .eq("client_id", clientId)
        .maybeSingle();
      if (data) {
        setMerchantId((data as any).merchant_id ?? "");
        setStoreToken((data as any).store_token ?? "");
        setEnvironment(((data as any).environment ?? "sandbox") as any);
      }
      setCredLoaded(true);
    })();
  }, [clientId, enabled]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const saveCredentials = async () => {
    if (!clientId) return;
    if (!merchantId.trim()) {
      toast.error("Informe o Merchant ID");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("food99_credentials" as any)
      .upsert(
        {
          client_id: clientId,
          merchant_id: merchantId.trim(),
          store_token: storeToken.trim() || null,
          environment,
          active: true,
        },
        { onConflict: "client_id" }
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Credenciais salvas!");
    }
  };

  if (loading) {
    return (
      <AppLayout title="Integração 99Food">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!enabled) {
    return (
      <AppLayout title="Integração 99Food">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Integração indisponível</CardTitle>
              <CardDescription>
                A integração com o 99Food não está habilitada para este cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")}>Voltar</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Integração 99Food"
      subtitle="Cadastro do app na DiDi Open Platform"
      actions={<Badge variant="secondary">Em homologação</Badge>}
    >
      <div className="space-y-6 max-w-4xl">
        <Tabs defaultValue="credentials">
          <TabsList>
            <TabsTrigger value="setup">Passo a passo</TabsTrigger>
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cadastro do App na 99Food</CardTitle>
                <CardDescription>
                  Siga as 6 etapas no portal de desenvolvedores da 99Food / DiDi Open Platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild variant="outline">
                  <a href="https://developer-food.99app.com/" target="_blank" rel="noreferrer">
                    Abrir portal 99Food <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>

                <ol className="list-decimal pl-6 space-y-3 text-sm">
                  <li><strong>Login</strong> no portal com a conta da empresa aprovada.</li>
                  <li><strong>Perfil da empresa:</strong> CNPJ, endereço e responsável técnico.</li>
                  <li><strong>Criar App:</strong> tipo Server-to-Server, vertical Food, país Brasil.</li>
                  <li><strong>APIs:</strong> Order, Menu, Store/Merchant e Webhook.</li>
                  <li><strong>Webhook:</strong> cole a URL da aba "Webhook" abaixo e clique Verify.</li>
                  <li><strong>Vincular loja:</strong> em "My Stores" obtenha o Merchant ID.</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais da loja</CardTitle>
                <CardDescription>
                  Cadastre o Merchant ID e o token da sua loja no 99Food. App Key/Secret são
                  configurados como segredos do servidor (já cadastrados).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!credLoaded ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Merchant ID *</Label>
                      <Input
                        placeholder="Ex: 5764615319785573736"
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        ID da loja vinculada no portal 99Food (3ª coluna na lista de lojas).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Token da loja (Base64)</Label>
                      <Textarea
                        placeholder="Ex: OGU3NTA0YjZhM...0MzA="
                        value={storeToken}
                        onChange={(e) => setStoreToken(e.target.value)}
                        rows={3}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        String longa em Base64 que aparece na lista de lojas (token específico da loja).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Ambiente</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as any)}
                      >
                        <option value="sandbox">Sandbox (Ambiente de teste)</option>
                        <option value="production">Produção</option>
                      </select>
                    </div>

                    <div className="border-l-4 border-primary bg-muted/30 p-3 text-sm rounded">
                      <strong>App Key</strong> e <strong>App Secret</strong> já estão configurados
                      como segredos seguros no servidor (FOOD99_APP_KEY / FOOD99_APP_SECRET).
                      Você só precisa cadastrar os dados específicos da sua loja acima.
                    </div>

                    <Button onClick={saveCredentials} disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar credenciais
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>URL de Webhook</CardTitle>
                <CardDescription>
                  Cole esta URL no campo "Endereço do webhook" ao criar o app no portal 99Food.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copy(WEBHOOK_URL)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Eventos a habilitar:</div>
                  <ul className="text-sm space-y-1 pl-4 list-disc">
                    <li>ORDER_CREATED / NEW_ORDER</li>
                    <li>ORDER_CONFIRMED</li>
                    <li>ORDER_CANCELLED</li>
                    <li>ORDER_READY</li>
                    <li>ORDER_DISPATCHED</li>
                    <li>ORDER_CONCLUDED</li>
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Endpoint já implantado e respondendo a verificação (challenge / echostr).
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
