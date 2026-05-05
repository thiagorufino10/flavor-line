import { useNavigate } from "react-router-dom";
import { Loader2, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useFood99Enabled } from "@/hooks/useFood99Enabled";
import { AppLayout } from "@/components/AppLayout";

const WEBHOOK_URL =
  "https://fficgvfnyfccynplhkyz.supabase.co/functions/v1/food99-webhook";

export default function Food99Integration() {
  const navigate = useNavigate();
  const { enabled, loading } = useFood99Enabled();

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
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
        <Tabs defaultValue="setup">
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
                  <li>
                    <strong>Login:</strong> acesse o portal com a conta da empresa aprovada.
                  </li>
                  <li>
                    <strong>Perfil da empresa:</strong> preencha CNPJ, endereço e responsável técnico.
                  </li>
                  <li>
                    <strong>Criar App:</strong> em "My Apps" → "Create App", selecione tipo
                    <em> Server-to-Server</em>, vertical <em>Food</em>, país Brasil.
                  </li>
                  <li>
                    <strong>APIs:</strong> marque Order API, Menu API, Store/Merchant API e Webhook /
                    Event Subscription.
                  </li>
                  <li>
                    <strong>Webhook:</strong> cole a URL da aba "Webhook" abaixo e clique em
                    <em> Verify</em>.
                  </li>
                  <li>
                    <strong>Vincular loja:</strong> em "My Stores" use o CNPJ da loja aprovada para
                    obter o <em>Merchant ID</em>.
                  </li>
                </ol>

                <div className="border-l-4 border-primary bg-muted/30 p-3 text-sm rounded">
                  Ao concluir, você receberá <strong>App Key</strong>, <strong>App Secret</strong> e
                  <strong> Merchant ID</strong>. Cadastre-os na aba "Credenciais".
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais da loja</CardTitle>
                <CardDescription>
                  Após criar o app, informe os dados abaixo. (Cadastro será habilitado quando a
                  integração for ativada.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Merchant ID</Label>
                  <Input placeholder="ID da loja vinculada no portal 99Food" disabled />
                </div>
                <div className="space-y-2">
                  <Label>App Key (Client ID)</Label>
                  <Input placeholder="Será armazenado como secret no servidor" disabled />
                </div>
                <div className="space-y-2">
                  <Label>App Secret</Label>
                  <Input
                    type="password"
                    placeholder="Será armazenado como secret no servidor"
                    disabled
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Por segurança, App Key e App Secret são armazenados como segredos da plataforma
                  (não ficam no banco). Envie suas credenciais ao administrador para cadastro.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>URL de Webhook</CardTitle>
                <CardDescription>
                  Cole esta URL no campo "Callback / Webhook URL" ao criar o app no portal 99Food.
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
