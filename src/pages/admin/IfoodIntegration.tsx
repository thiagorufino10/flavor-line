import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Plug, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIfoodEnabled } from "@/hooks/useIfoodEnabled";
import { AppLayout } from "@/components/AppLayout";

type Cred = {
  id: string;
  merchant_id: string;
  environment: "sandbox" | "production";
  active: boolean;
  last_polling_at: string | null;
};

type EventLog = {
  id: string;
  event_id: string;
  event_type: string;
  order_external_id: string | null;
  processed: boolean;
  error_message: string | null;
  created_at: string;
};

export default function IfoodIntegration() {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { enabled, loading: loadingFlag } = useIfoodEnabled();

  const [cred, setCred] = useState<Cred | null>(null);
  const [merchantId, setMerchantId] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!clientId) return;
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from("ifood_credentials").select("*").eq("client_id", clientId).maybeSingle(),
      supabase
        .from("ifood_event_log")
        .select("id, event_id, event_type, order_external_id, processed, error_message, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (c) {
      setCred(c as Cred);
      setMerchantId((c as any).merchant_id ?? "");
      setEnvironment((c as any).environment ?? "sandbox");
    }
    setEvents((e ?? []) as EventLog[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [clientId]);

  const handleSave = async () => {
    if (!clientId || !merchantId.trim()) {
      toast.error("Merchant ID é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      client_id: clientId,
      merchant_id: merchantId.trim(),
      environment,
      active: true,
    };
    const { error } = cred
      ? await supabase.from("ifood_credentials").update(payload).eq("id", cred.id)
      : await supabase.from("ifood_credentials").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração salva");
      loadAll();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("ifood-test-connection");
    setTesting(false);
    if (error || !(data as any)?.ok) {
      toast.error((data as any)?.error ?? error?.message ?? "Falha na conexão");
    } else {
      toast.success(`Conexão OK (${(data as any).latency_ms}ms)`);
    }
  };

  const handleRunPolling = async () => {
    setPolling(true);
    const { data, error } = await supabase.functions.invoke("ifood-poller");
    setPolling(false);
    if (error) {
      toast.error(error.message);
    } else {
      const total = ((data as any)?.results ?? []).reduce(
        (s: number, r: any) => s + (r.events ?? 0),
        0
      );
      toast.success(`Polling executado — ${total} evento(s) processado(s)`);
      loadAll();
    }
  };

  if (loadingFlag) {
    return (
      <AppLayout title="Integração iFood">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!enabled) {
    return (
      <AppLayout title="Integração iFood">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Integração indisponível</CardTitle>
              <CardDescription>
                A integração com marketplaces externos não está habilitada para este cliente.
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
      title="Integração iFood"
      subtitle="Sandbox de homologação — pedidos chegam na tela de aprovação manual"
      actions={
        <Badge variant={environment === "production" ? "default" : "secondary"}>
          {environment === "production" ? "Produção" : "Sandbox"}
        </Badge>
      }
    >
      <div className="space-y-6">
        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="logs">Eventos recebidos</TabsTrigger>
          </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da loja</CardTitle>
              <CardDescription>
                O Client ID/Secret são gerenciados pelo provedor do sistema. Você só precisa
                informar o Merchant ID da sua loja no portal iFood.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant ID</Label>
                <Input
                  id="merchant"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="ex: 9b3aaaaa-1111-2222-3333-xxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={environment === "sandbox" ? "default" : "outline"}
                    onClick={() => setEnvironment("sandbox")}
                  >
                    Sandbox (homologação)
                  </Button>
                  <Button
                    type="button"
                    variant={environment === "production" ? "default" : "outline"}
                    onClick={() => setEnvironment("production")}
                  >
                    Produção
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Testar conexão
                </Button>
                <Button variant="outline" onClick={handleRunPolling} disabled={polling || !cred}>
                  {polling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Rodar polling agora
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                ⚡ Polling automático ativo: o sistema verifica novos pedidos do iFood a cada 10 segundos.
              </p>
              {cred?.last_polling_at && (
                <p className="text-xs text-muted-foreground">
                  Último polling: {new Date(cred.last_polling_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Últimos 50 eventos</CardTitle>
                <CardDescription>Auditoria de tudo que o iFood enviou</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum evento ainda. O polling automático roda a cada 10s — assim que o iFood enviar um pedido, ele aparecerá aqui.
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 border rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3">
                        {e.processed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <div>
                          <div className="font-medium">{e.event_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.order_external_id ?? "—"} ·{" "}
                            {new Date(e.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {e.error_message && (
                        <Badge variant="destructive" className="max-w-xs truncate">
                          {e.error_message}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
