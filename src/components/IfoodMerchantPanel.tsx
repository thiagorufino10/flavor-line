import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Loader2, Store, Clock, Pause, Power, AlertTriangle,
  CheckCircle2, XCircle, Plus, Trash2, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ApiResp<T = any> = { ok: boolean; status: number; data?: T; code?: string; message?: string; retryAfter?: string };

const DAYS = [
  { code: "MONDAY", label: "Seg" },
  { code: "TUESDAY", label: "Ter" },
  { code: "WEDNESDAY", label: "Qua" },
  { code: "THURSDAY", label: "Qui" },
  { code: "FRIDAY", label: "Sex" },
  { code: "SATURDAY", label: "Sáb" },
  { code: "SUNDAY", label: "Dom" },
];

type Shift = { dayOfWeek: string; start: string; duration: number };
type Interruption = { id?: string; description: string; start: string; end: string };

async function call<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResp<T>> {
  const { data, error } = await supabase.functions.invoke("ifood-merchant", {
    body: { action, ...payload },
  });
  if (error) {
    return { ok: false, status: 0, code: "NetworkError", message: error.message };
  }
  return data as ApiResp<T>;
}

function showError(r: ApiResp) {
  const codeTxt = r.code ? `[${r.code}]` : "";
  const status = r.status ? ` (HTTP ${r.status})` : "";
  toast.error(`${codeTxt} ${r.message ?? "Erro desconhecido"}${status}`);
}

export function IfoodMerchantPanel() {
  const [merchantId, setMerchantId] = useState<string>("");

  // Estado da loja
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Pausas
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);
  const [newInter, setNewInter] = useState<Interruption>({
    description: "Pausa operacional",
    start: "",
    end: "",
  });
  const [loadingInter, setLoadingInter] = useState(false);
  const [savingInter, setSavingInter] = useState(false);

  // Horários
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  // Carrega lista de lojas (1ª aba) — define merchantId padrão
  const loadMerchants = async () => {
    setLoadingDetails(true);
    const r = await call("list_merchants");
    setLoadingDetails(false);
    if (!r.ok) return showError(r);
    const list = Array.isArray(r.data) ? r.data : [];
    setMerchants(list);
    if (list.length > 0 && !merchantId) {
      setMerchantId(list[0].id);
    }
  };

  const loadDetails = async () => {
    if (!merchantId) return;
    setLoadingDetails(true);
    const r = await call("get_merchant", { merchantId });
    setLoadingDetails(false);
    if (!r.ok) return showError(r);
    setMerchantInfo(r.data);
  };

  const loadStatus = async () => {
    if (!merchantId) return;
    setLoadingStatus(true);
    const r = await call("get_status", { merchantId });
    setLoadingStatus(false);
    if (!r.ok) return showError(r);
    setStatusInfo(r.data);
  };

  const loadInterruptions = async () => {
    if (!merchantId) return;
    setLoadingInter(true);
    const r = await call<Interruption[]>("list_interruptions", { merchantId });
    setLoadingInter(false);
    if (!r.ok) return showError(r);
    setInterruptions(Array.isArray(r.data) ? r.data : []);
  };

  const createInterruption = async () => {
    if (!newInter.description || !newInter.start || !newInter.end) {
      return toast.error("Preencha descrição, início e fim");
    }
    setSavingInter(true);
    // Converte datetime-local → ISO 8601
    const payload = {
      merchantId,
      description: newInter.description,
      start: new Date(newInter.start).toISOString(),
      end: new Date(newInter.end).toISOString(),
    };
    const r = await call("create_interruption", payload);
    setSavingInter(false);
    if (!r.ok) return showError(r);
    toast.success("Pausa criada");
    setNewInter({ description: "Pausa operacional", start: "", end: "" });
    loadInterruptions();
  };

  const deleteInterruption = async (id: string) => {
    if (!confirm("Remover esta pausa?")) return;
    const r = await call("delete_interruption", { merchantId, interruptionId: id });
    if (!r.ok) return showError(r);
    toast.success("Pausa removida");
    loadInterruptions();
  };

  const loadHours = async () => {
    if (!merchantId) return;
    setLoadingHours(true);
    const r = await call("get_opening_hours", { merchantId });
    setLoadingHours(false);
    if (!r.ok) return showError(r);
    const list = (r.data as any)?.shifts ?? r.data ?? [];
    setShifts(Array.isArray(list) ? list : []);
  };

  const updateShift = (idx: number, patch: Partial<Shift>) => {
    setShifts((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addShift = () => {
    setShifts((prev) => [...prev, { dayOfWeek: "MONDAY", start: "10:00", duration: 600 }]);
  };

  const removeShift = (idx: number) => {
    setShifts((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveHours = async () => {
    setSavingHours(true);
    const payload = {
      merchantId,
      shifts: shifts.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        start: s.start.length === 5 ? `${s.start}:00` : s.start,
        duration: Number(s.duration),
      })),
    };
    const r = await call("update_opening_hours", payload);
    setSavingHours(false);
    if (!r.ok) return showError(r);
    toast.success("Horários atualizados");
    loadHours();
  };

  // Auto-load ao montar
  useEffect(() => {
    loadMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando mudar merchantId, recarrega tudo
  useEffect(() => {
    if (!merchantId) return;
    loadDetails();
    loadStatus();
    loadInterruptions();
    loadHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  const statusColor = useMemo(() => {
    const s = statusInfo?.state ?? statusInfo?.[0]?.state;
    if (s === "OK") return "default";
    if (s === "WARNING") return "secondary";
    if (s === "CLOSED") return "destructive";
    return "outline";
  }, [statusInfo]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" /> Merchant — Configurações da loja
        </CardTitle>
        <CardDescription>
          Módulo de homologação iFood Merchant API. Gerencie loja, status, pausas (interrupções) e horários
          de funcionamento. Polling de status mínimo: 30s.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de loja */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-[260px]">
            <Label>Merchant ID</Label>
            <Input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="ID da loja"
            />
          </div>
          <Button variant="outline" onClick={loadMerchants} disabled={loadingDetails}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingDetails ? "animate-spin" : ""}`} />
            Listar lojas (GET /merchants)
          </Button>
        </div>

        {merchants.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Lojas disponíveis ({merchants.length}):{" "}
            {merchants.slice(0, 5).map((m) => (
              <button
                key={m.id}
                onClick={() => setMerchantId(m.id)}
                className="underline hover:text-primary mr-2"
              >
                {m.name ?? m.corporateName ?? m.id}
              </button>
            ))}
          </div>
        )}

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Loja</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="interruptions">Pausas</TabsTrigger>
            <TabsTrigger value="hours">Horários</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                <code>GET /merchants/{`{id}`}</code> · retorna nome, CNPJ, operações e endereço
              </p>
              <Button size="sm" variant="outline" onClick={loadDetails} disabled={loadingDetails}>
                <RefreshCw className={`w-4 h-4 ${loadingDetails ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {merchantInfo ? (
              <div className="border rounded p-3 space-y-2 text-sm">
                <div><strong>Nome:</strong> {safe(merchantInfo.name)}</div>
                <div><strong>Razão social:</strong> {safe(merchantInfo.corporateName)}</div>
                {merchantInfo.address && (
                  <div className="text-xs text-muted-foreground">
                    📍 {safe(merchantInfo.address.street)}, {safe(merchantInfo.address.number)} —{" "}
                    {safe(merchantInfo.address.neighborhood)}, {safe(merchantInfo.address.city)}/
                    {safe(merchantInfo.address.state)}
                  </div>
                )}
                {merchantInfo.operations && (
                  <div className="flex gap-1 flex-wrap">
                    {(Array.isArray(merchantInfo.operations) ? merchantInfo.operations : [merchantInfo.operations]).map(
                      (op: any, i: number) => (
                        <Badge key={i} variant="outline">{safe(op) || `Operação ${i + 1}`}</Badge>
                      ),
                    )}
                  </div>
                )}
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer text-muted-foreground">Ver payload completo</summary>
                  <pre className="bg-muted/50 p-2 rounded mt-1 overflow-auto max-h-64">
{JSON.stringify(merchantInfo, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {loadingDetails ? "Carregando..." : "Sem dados. Selecione uma loja."}
              </p>
            )}
          </TabsContent>

          {/* STATUS */}
          <TabsContent value="status" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                <code>GET /merchants/{`{id}`}/status</code> · OK/WARNING/CLOSED/ERROR
              </p>
              <Button size="sm" variant="outline" onClick={loadStatus} disabled={loadingStatus}>
                <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {statusInfo ? (
              <div className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Power className="w-4 h-4" />
                  <Badge variant={statusColor}>
                    {statusInfo.state ?? statusInfo[0]?.state ?? "—"}
                  </Badge>
                  <span className="text-sm">
                    Disponível:{" "}
                    {String(statusInfo.available ?? statusInfo[0]?.available ?? "—")}
                  </span>
                </div>
                {Array.isArray(statusInfo) && statusInfo[0]?.validations && (
                  <div className="space-y-1 text-xs">
                    {statusInfo[0].validations.map((v: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        {v.state === "OK" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                        )}
                        <span className="font-mono">{v.id}</span>
                        <span className="text-muted-foreground">— {v.message ?? v.state}</span>
                      </div>
                    ))}
                  </div>
                )}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ver payload completo</summary>
                  <pre className="bg-muted/50 p-2 rounded mt-1 overflow-auto max-h-64">
{JSON.stringify(statusInfo, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {loadingStatus ? "Carregando..." : "Sem dados."}
              </p>
            )}
          </TabsContent>

          {/* INTERRUPTIONS */}
          <TabsContent value="interruptions" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                <code>GET / POST / DELETE /merchants/{`{id}`}/interruptions</code>
              </p>
              <Button size="sm" variant="outline" onClick={loadInterruptions} disabled={loadingInter}>
                <RefreshCw className={`w-4 h-4 ${loadingInter ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Form criar pausa */}
            <div className="border rounded p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Pause className="w-4 h-4" /> Nova pausa
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="Descrição"
                  value={newInter.description}
                  onChange={(e) => setNewInter({ ...newInter, description: e.target.value })}
                />
                <Input
                  type="datetime-local"
                  value={newInter.start}
                  onChange={(e) => setNewInter({ ...newInter, start: e.target.value })}
                />
                <Input
                  type="datetime-local"
                  value={newInter.end}
                  onChange={(e) => setNewInter({ ...newInter, end: e.target.value })}
                />
              </div>
              <Button size="sm" onClick={createInterruption} disabled={savingInter}>
                {savingInter ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Criar pausa
              </Button>
            </div>

            {/* Lista pausas */}
            {interruptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {loadingInter ? "Carregando..." : "Nenhuma pausa ativa."}
              </p>
            ) : (
              <div className="space-y-2">
                {interruptions.map((i) => (
                  <div key={i.id} className="border rounded p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{i.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(i.start).toLocaleString("pt-BR")} →{" "}
                        {new Date(i.end).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    {i.id && (
                      <Button size="sm" variant="ghost" onClick={() => deleteInterruption(i.id!)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* HOURS */}
          <TabsContent value="hours" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                <code>GET / PUT /merchants/{`{id}`}/opening-hours</code> · duração em minutos
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={loadHours} disabled={loadingHours}>
                  <RefreshCw className={`w-4 h-4 ${loadingHours ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" variant="outline" onClick={addShift}>
                  <Plus className="w-4 h-4 mr-1" /> Turno
                </Button>
              </div>
            </div>

            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {loadingHours ? "Carregando..." : "Nenhum turno configurado."}
              </p>
            ) : (
              <div className="space-y-2">
                {shifts.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center border rounded p-2">
                    <div className="col-span-4">
                      <select
                        className="w-full h-9 px-2 rounded border bg-background text-sm"
                        value={s.dayOfWeek}
                        onChange={(e) => updateShift(idx, { dayOfWeek: e.target.value })}
                      >
                        {DAYS.map((d) => (
                          <option key={d.code} value={d.code}>{d.label} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="time"
                        value={s.start.substring(0, 5)}
                        onChange={(e) => updateShift(idx, { start: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min={1}
                        value={s.duration}
                        onChange={(e) => updateShift(idx, { duration: Number(e.target.value) })}
                        placeholder="Duração (min)"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => removeShift(idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={saveHours} disabled={savingHours}>
                  {savingHours ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar horários (PUT)
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
