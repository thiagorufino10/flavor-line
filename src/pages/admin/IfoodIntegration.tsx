import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, CheckCircle2, XCircle, Loader2, Play, Activity,
  AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Copy,
} from "lucide-react";
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
import { IfoodMerchantPanel } from "@/components/IfoodMerchantPanel";
import { IfoodCatalogPanel } from "@/components/IfoodCatalogPanel";

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
  payload: any;
};

const EVENT_TYPES = [
  "all",
  "PLC", "CFM", "DSP", "RTP", "CON", "CAN", "CRE", "HMC", "HMD",
];

const HOMOLOG_CHECKLIST = [
  { id: "polling", label: "Polling a cada 30s (cron automático)", done: true },
  { id: "ack", label: "Acknowledgment de TODOS os eventos (até 2000/lote)", done: true },
  { id: "dedup", label: "Deduplicação de eventos por event_id (UNIQUE)", done: true },
  { id: "events", label: "Tratamento de PLC/CFM/DSP/RTP/CON/CAN/CRE", done: true },
  { id: "negotiation", label: "Plataforma de Negociação (HMC/HMD) registrada", done: true },
  { id: "cancel", label: "Motivos de cancelamento dinâmicos via /cancellationReasons", done: true },
  { id: "sync", label: "Sincronização de status entre apps", done: true },
  { id: "backoff", label: "Backoff exponencial em rate limit (HTTP 429)", done: true },
  { id: "fields", label: "Captura completa: bandeira, troco, cupom, CPF, código de coleta", done: true },
  { id: "obs", label: "Observações de entrega impressas na comanda (Restaurante)", done: true },
  { id: "sla", label: "Indicador de SLA visível na tela de aprovação", done: true },
  { id: "audit", label: "Auditoria: log de eventos + payload bruto disponível", done: true },
  // Módulo Merchant (homologação)
  { id: "merch_list", label: "Merchant · GET /merchants (lista lojas)", done: true },
  { id: "merch_get", label: "Merchant · GET /merchants/{id} (detalhes + endereço)", done: true },
  { id: "merch_status", label: "Merchant · GET /merchants/{id}/status (OK/WARNING/CLOSED/ERROR)", done: true },
  { id: "merch_inter", label: "Merchant · GET/POST/DELETE /interruptions (pausas)", done: true },
  { id: "merch_hours", label: "Merchant · GET/PUT /opening-hours (horários por turno)", done: true },
  { id: "merch_errors", label: "Merchant · Erros padronizados {code,message} + Retry-After", done: true },
  // Módulo Catalog (homologação)
  { id: "cat_list", label: "Catalog · GET /catalogs (lista catálogos)", done: true },
  { id: "cat_categories_list", label: "Catalog · GET /catalogs/{id}/categories (lista categorias)", done: true },
  { id: "cat_categories_create", label: "Catalog · POST /catalogs/{id}/categories (cria categoria)", done: true },
  { id: "cat_item_upsert", label: "Catalog · PUT /items (cria/edita item completo)", done: true },
  { id: "cat_item_price", label: "Catalog · PATCH /items/price (altera preço)", done: true },
  { id: "cat_item_status", label: "Catalog · PATCH /items/status (altera status)", done: true },
  { id: "cat_option_price", label: "Catalog · PATCH /options/price (preço de complemento)", done: true },
  { id: "cat_option_status", label: "Catalog · PATCH /options/status (status de complemento)", done: true },
  { id: "cat_image", label: "Catalog · POST /image/upload (upload de imagens)", done: true },
];

function fmtRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  return `${h}h atrás`;
}

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
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Atualiza UI a cada 15s (mostrar último polling em "tempo real")
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const loadAll = async () => {
    if (!clientId) return;
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from("ifood_credentials").select("*").eq("client_id", clientId).maybeSingle(),
      supabase
        .from("ifood_event_log")
        .select("id, event_id, event_type, order_external_id, processed, error_message, created_at, payload")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(200),
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

  // Métricas e saúde
  const health = useMemo(() => {
    void tick;
    if (!cred?.last_polling_at) {
      return { status: "unknown" as const, label: "Aguardando primeiro polling", color: "secondary" as const };
    }
    const ageMs = Date.now() - new Date(cred.last_polling_at).getTime();
    if (ageMs < 90_000) return { status: "ok" as const, label: "Polling saudável", color: "default" as const };
    if (ageMs < 300_000) return { status: "warn" as const, label: "Polling atrasado", color: "secondary" as const };
    return { status: "down" as const, label: "Polling parado (>5min)", color: "destructive" as const };
  }, [cred?.last_polling_at, tick]);

  const metrics = useMemo(() => {
    const total = events.length;
    const processed = events.filter((e) => e.processed).length;
    const errors = events.filter((e) => e.error_message).length;
    const last24h = events.filter(
      (e) => Date.now() - new Date(e.created_at).getTime() < 86_400_000
    ).length;
    const lastError = events.find((e) => e.error_message);
    return { total, processed, errors, last24h, lastError };
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return events;
    return events.filter((e) => e.event_type.toUpperCase().startsWith(filterType));
  }, [events, filterType]);

  const copyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    toast.success("JSON copiado");
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
      subtitle="Painel de homologação · Order API"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={health.color}>
            <Activity className="w-3 h-3 mr-1" />
            {health.label}
          </Badge>
          <Badge variant={environment === "production" ? "default" : "secondary"}>
            {environment === "production" ? "Produção" : "Sandbox"}
          </Badge>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Cards de métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Eventos (últimos 200)</div>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Processados</div>
              <div className="text-2xl font-bold text-green-600">{metrics.processed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Com erro</div>
              <div className={`text-2xl font-bold ${metrics.errors > 0 ? "text-destructive" : ""}`}>
                {metrics.errors}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Últimas 24h</div>
              <div className="text-2xl font-bold">{metrics.last24h}</div>
            </CardContent>
          </Card>
        </div>

        {health.status === "down" && (
          <div className="flex items-start gap-2 p-3 rounded-md border-2 border-destructive bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-destructive">Polling parado:</strong> nenhuma chamada nos últimos 5 minutos.
              Verifique se o cron está ativo ou clique em "Rodar polling agora" para diagnosticar.
            </div>
          </div>
        )}

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="merchant">Merchant</TabsTrigger>
            <TabsTrigger value="catalog">Catálogo</TabsTrigger>
            <TabsTrigger value="logs">Eventos recebidos</TabsTrigger>
            <TabsTrigger value="homolog">Checklist homologação</TabsTrigger>
          </TabsList>

          <TabsContent value="merchant">
            <IfoodMerchantPanel />
          </TabsContent>

          <TabsContent value="catalog">
            <IfoodCatalogPanel />
          </TabsContent>

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
                <div className="text-xs text-muted-foreground space-y-1 pt-2">
                  <p>⚡ Polling automático ativo: 30 segundos (exigência iFood).</p>
                  {cred?.last_polling_at && (
                    <p>
                      Último polling: {new Date(cred.last_polling_at).toLocaleString("pt-BR")} ({fmtRelative(cred.last_polling_at)})
                    </p>
                  )}
                  {metrics.lastError && (
                    <p className="text-destructive">
                      Último erro: {metrics.lastError.error_message} ({fmtRelative(metrics.lastError.created_at)})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Eventos recebidos</CardTitle>
                  <CardDescription>Auditoria completa para homologação iFood</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1 flex-wrap">
                    {EVENT_TYPES.map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={filterType === t ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setFilterType(t)}
                      >
                        {t === "all" ? "Todos" : t}
                      </Button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {events.length === 0
                      ? "Nenhum evento ainda. O polling automático roda a cada 30s."
                      : "Nenhum evento corresponde ao filtro."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.map((e) => {
                      const isExp = expandedEvent === e.id;
                      return (
                        <div key={e.id} className="border rounded-lg text-sm overflow-hidden">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40"
                            onClick={() => setExpandedEvent(isExp ? null : e.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {e.processed ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="font-medium flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                                  <span className="font-mono text-xs truncate">{e.order_external_id ?? "—"}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(e.created_at).toLocaleString("pt-BR")} · {fmtRelative(e.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {e.error_message && (
                                <Badge variant="destructive" className="max-w-[180px] truncate">
                                  {e.error_message}
                                </Badge>
                              )}
                              {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                          {isExp && (
                            <div className="border-t p-3 bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Payload do evento</span>
                                <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); copyJson(e.payload); }}>
                                  <Copy className="w-3 h-3 mr-1" /> Copiar JSON
                                </Button>
                              </div>
                              <pre className="text-[10px] bg-background p-2 rounded max-h-64 overflow-auto whitespace-pre-wrap break-all">
{JSON.stringify(e.payload, null, 2)}
                              </pre>
                              <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                                event_id: {e.event_id}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homolog">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  Critérios atendidos
                </CardTitle>
                <CardDescription>
                  Conformidade com os requisitos de homologação iFood Order API (categoria Restaurante).
                  Apresente esta tela ao analista do iFood durante a sessão de validação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {HOMOLOG_CHECKLIST.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 p-2 rounded border bg-card">
                    {c.done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <span className="text-sm">{c.label}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-3 border-t mt-3 space-y-1">
                  <p><strong>Endpoints implementados:</strong></p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li><code>POST /authentication/v1.0/oauth/token</code></li>
                    <li><code>GET /events/v1.0/events:polling</code> (a cada 30s)</li>
                    <li><code>POST /events/v1.0/events/acknowledgment</code> (lotes ≤ 2000)</li>
                    <li><code>GET /order/v1.0/orders/{`{orderId}`}</code></li>
                    <li><code>POST /order/v1.0/orders/{`{orderId}`}/confirm</code></li>
                    <li><code>POST /order/v1.0/orders/{`{orderId}`}/readyToPickup</code></li>
                    <li><code>POST /order/v1.0/orders/{`{orderId}`}/dispatch</code></li>
                    <li><code>GET  /order/v1.0/orders/{`{orderId}`}/cancellationReasons</code></li>
                    <li><code>POST /order/v1.0/orders/{`{orderId}`}/requestCancellation</code></li>
                    <li className="pt-2 font-semibold text-foreground">Módulo Merchant</li>
                    <li><code>GET  /merchant/v1.0/merchants</code></li>
                    <li><code>GET  /merchant/v1.0/merchants/{`{id}`}</code></li>
                    <li><code>GET  /merchant/v1.0/merchants/{`{id}`}/status</code></li>
                    <li><code>GET  /merchant/v1.0/merchants/{`{id}`}/interruptions</code></li>
                    <li><code>POST /merchant/v1.0/merchants/{`{id}`}/interruptions</code></li>
                    <li><code>DELETE /merchant/v1.0/merchants/{`{id}`}/interruptions/{`{interruptionId}`}</code></li>
                    <li><code>GET  /merchant/v1.0/merchants/{`{id}`}/opening-hours</code></li>
                    <li><code>PUT  /merchant/v1.0/merchants/{`{id}`}/opening-hours</code></li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
