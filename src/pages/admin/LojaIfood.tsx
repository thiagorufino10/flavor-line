import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Store, Clock, PauseCircle, PlayCircle, Loader2 } from "lucide-react";
import { useIfoodEnabled } from "@/hooks/useIfoodEnabled";
import { AppLayout } from "@/components/AppLayout";

const DAYS = [
  { key: "MONDAY", label: "Segunda" },
  { key: "TUESDAY", label: "Terça" },
  { key: "WEDNESDAY", label: "Quarta" },
  { key: "THURSDAY", label: "Quinta" },
  { key: "FRIDAY", label: "Sexta" },
  { key: "SATURDAY", label: "Sábado" },
  { key: "SUNDAY", label: "Domingo" },
];

type Shift = {
  dayOfWeek: string;
  start: string;       // HH:mm:ss
  duration: number;    // minutos
  enabled?: boolean;
};

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
function durationToEnd(start: string, duration: number) {
  const [sh, sm] = start.split(":").map(Number);
  const total = sh * 60 + sm + duration;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function isoLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Normaliza resposta de /status que pode vir como array de operações ou objeto único
function normalizeStatus(raw: any) {
  if (!raw) return { state: "UNKNOWN", available: false, validations: [] as any[], operations: [] as any[] };

  // Caso comum: array de operações [{ state, operation, available, validations }]
  if (Array.isArray(raw)) {
    const delivery = raw.find((o: any) => o.operation === "DELIVERY") ?? raw[0];
    return {
      state: delivery?.state ?? raw[0]?.state ?? "UNKNOWN",
      available: Boolean(delivery?.available ?? raw[0]?.available),
      validations: delivery?.validations ?? raw[0]?.validations ?? [],
      operations: raw,
    };
  }

  // Objeto único
  return {
    state: raw.state ?? raw.operation ?? "UNKNOWN",
    available: Boolean(raw.available ?? String(raw.state).toUpperCase() === "OK"),
    validations: raw.validations ?? [],
    operations: [raw],
  };
}

const safe = (v: any): string => {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") {
    return (v.name ?? v.title ?? v.label ?? v.subtitle ?? v.description ?? v.message ?? v.code ?? v.value ?? JSON.stringify(v)).toString();
  }
  return String(v);
};

export default function LojaIfood() {
  const { toast } = useToast();
  const { enabled: ifoodEnabled, loading: flagLoading } = useIfoodEnabled();

  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [creatingPause, setCreatingPause] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [statusInfo, setStatusInfo] = useState<ReturnType<typeof normalizeStatus> | null>(null);
  const [shifts, setShifts] = useState<Record<string, { start: string; end: string; enabled: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d.key, { start: "08:00", end: "18:00", enabled: false }])),
  );
  const [interruptions, setInterruptions] = useState<any[]>([]);

  const [pauseReason, setPauseReason] = useState("");
  const [pauseDuration, setPauseDuration] = useState("60");

  async function call(action: string, body: any = {}) {
    const { data, error } = await supabase.functions.invoke("ifood-merchant", {
      body: { action, ...body },
    });
    if (error) throw new Error(error.message || "Erro ao chamar iFood");
    if (!data?.ok) throw new Error(data?.message || "Erro iFood");
    return data.data;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [status, oh, ints] = await Promise.all([
        call("get_status").catch((e) => { console.warn("status err:", e); return null; }),
        call("get_opening_hours").catch((e) => { console.warn("hours err:", e); return null; }),
        call("list_interruptions").catch((e) => { console.warn("ints err:", e); return []; }),
      ]);

      setStatusInfo(normalizeStatus(status));

      if (oh && Array.isArray(oh.shifts)) {
        const next: typeof shifts = Object.fromEntries(
          DAYS.map((d) => [d.key, { start: "08:00", end: "18:00", enabled: false }]),
        ) as any;
        for (const s of oh.shifts as Shift[]) {
          // Presença no array = dia aberto. Ausência = fechado.
          // Ignoramos shifts sem duração válida.
          if (!s?.dayOfWeek || !(Number(s.duration) > 0)) continue;
          const start = (s.start || "08:00:00").slice(0, 5);
          const end = durationToEnd(start, Number(s.duration));
          next[s.dayOfWeek] = { start, end, enabled: true };
        }
        setShifts(next);
      }

      setInterruptions(Array.isArray(ints) ? ints : []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar dados do iFood", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!flagLoading && ifoodEnabled) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagLoading, ifoodEnabled]);

  async function saveHours() {
    setSavingHours(true);
    try {
      // Envia TODOS os dias — desativados vão com enabled:false e duração 0
      // para que o iFood feche a loja naquele dia.
      const payload: Shift[] = DAYS.map((d) => {
        const s = shifts[d.key];
        if (!s.enabled) {
          return {
            dayOfWeek: d.key,
            start: "00:00:00",
            duration: 0,
            enabled: false,
          };
        }
        const dur = minutesBetween(s.start, s.end);
        if (dur <= 0) throw new Error(`Horário inválido em ${d.label}`);
        return {
          dayOfWeek: d.key,
          start: `${s.start}:00`,
          duration: dur,
          enabled: true,
        };
      });
      await call("update_opening_hours", { shifts: payload });
      toast({ title: "Horários atualizados", description: "Enviados ao iFood com sucesso." });
      loadAll();
    } catch (e: any) {
      toast({ title: "Erro ao salvar horários", description: e.message, variant: "destructive" });
    } finally {
      setSavingHours(false);
    }
  }

  async function createPause() {
    if (!pauseReason.trim()) {
      toast({ title: "Informe o motivo da pausa", variant: "destructive" });
      return;
    }
    const minutes = parseInt(pauseDuration, 10);
    if (!minutes || minutes <= 0) {
      toast({ title: "Duração inválida", variant: "destructive" });
      return;
    }
    setCreatingPause(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + minutes * 60_000);
      await call("create_interruption", {
        description: pauseReason.trim(),
        start: isoLocal(start),
        end: isoLocal(end),
      });
      toast({ title: "Loja pausada no iFood", description: `Pausada por ${minutes} min` });
      setPauseReason("");
      loadAll();
    } catch (e: any) {
      toast({ title: "Erro ao pausar", description: e.message, variant: "destructive" });
    } finally {
      setCreatingPause(false);
    }
  }

  async function removeInterruption(id: string) {
    setRemovingId(id);
    try {
      await call("delete_interruption", { interruptionId: id });
      toast({ title: "Pausa removida", description: "A loja voltou ao funcionamento normal." });
      loadAll();
    } catch (e: any) {
      toast({ title: "Erro ao remover pausa", description: e.message, variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  }

  if (flagLoading) {
    return (
      <AppLayout title="Loja iFood">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }
  if (!ifoodEnabled) {
    return (
      <AppLayout title="Loja iFood">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Integração iFood não habilitada</CardTitle>
            <CardDescription>Solicite ao suporte para liberar a integração no seu cliente.</CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  const stateRaw = statusInfo?.state ?? "—";
  const stateLabel = safe(stateRaw);
  const upper = String(stateLabel).toUpperCase();
  const isAvailable = statusInfo?.available || upper === "OK" || upper === "AVAILABLE";
  const badgeVariant: "default" | "destructive" | "secondary" = isAvailable
    ? "default"
    : upper === "WARNING"
      ? "secondary"
      : "destructive";
  const badgeText = isAvailable ? "Aberta" : upper === "WARNING" ? "Atenção" : upper === "CLOSED" ? "Fechada" : stateLabel;

  return (
    <AppLayout
      title="Loja iFood"
      subtitle="Configure horários e disponibilidade da sua loja no iFood"
      actions={
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" /> Painel da Loja
          </h2>
        </div>

        {/* STATUS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Status atual
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant={badgeVariant}>{badgeText}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Informações vindas direto do iFood sobre a disponibilidade da sua loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!statusInfo && !loading && (
              <p className="text-sm text-muted-foreground">Não foi possível obter o status no momento.</p>
            )}
            {statusInfo && Array.isArray(statusInfo.operations) && statusInfo.operations.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {statusInfo.operations.map((op: any, i: number) => (
                  <Badge key={i} variant="outline">
                    {safe(op.operation)}: {safe(op.state)}
                  </Badge>
                ))}
              </div>
            )}
            {statusInfo && Array.isArray(statusInfo.validations) && statusInfo.validations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Pendências do iFood</Label>
                <ul className="text-sm space-y-1">
                  {statusInfo.validations.map((v: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>{safe(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {statusInfo && isAvailable && (!statusInfo.validations || statusInfo.validations.length === 0) && (
              <p className="text-sm text-muted-foreground">Tudo certo — a loja está aberta no iFood.</p>
            )}
          </CardContent>
        </Card>

        {/* HORÁRIOS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Horários de funcionamento</CardTitle>
            <CardDescription>
              Marque os dias em que a loja abre e configure o horário. Dias desmarcados serão fechados no iFood.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((d) => {
              const s = shifts[d.key];
              return (
                <div key={d.key} className="flex flex-wrap items-center gap-3 p-3 rounded-md border">
                  <div className="flex items-center gap-3 w-32">
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(v) => setShifts({ ...shifts, [d.key]: { ...s, enabled: v } })}
                    />
                    <span className="font-medium">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Abre</Label>
                    <Input
                      type="time"
                      value={s.start}
                      disabled={!s.enabled}
                      onChange={(e) => setShifts({ ...shifts, [d.key]: { ...s, start: e.target.value } })}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Fecha</Label>
                    <Input
                      type="time"
                      value={s.end}
                      disabled={!s.enabled}
                      onChange={(e) => setShifts({ ...shifts, [d.key]: { ...s, end: e.target.value } })}
                      className="w-32"
                    />
                  </div>
                  {!s.enabled && (
                    <Badge variant="outline" className="text-xs">Fechado</Badge>
                  )}
                </div>
              );
            })}

            <Button onClick={saveHours} disabled={savingHours} className="w-full md:w-auto">
              {savingHours && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar horários no iFood
            </Button>
          </CardContent>
        </Card>

        {/* PAUSAR LOJA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PauseCircle className="w-5 h-5" /> Pausar a loja agora</CardTitle>
            <CardDescription>
              Use para fechar a loja temporariamente fora do horário normal (ex.: falta de ingrediente, problema na cozinha).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label>Motivo</Label>
                <Input
                  placeholder="Ex.: Falta de insumo"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <Label>Duração</Label>
                <Select value={pauseDuration} onValueChange={setPauseDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={createPause} disabled={creatingPause} variant="destructive">
              {creatingPause && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <PauseCircle className="w-4 h-4 mr-2" />
              Pausar loja agora
            </Button>

            <div className="pt-4 border-t">
              <Label className="text-xs uppercase text-muted-foreground">Pausas ativas</Label>
              {interruptions.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">Nenhuma pausa em andamento.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {interruptions.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                      <div className="text-sm">
                        <div className="font-medium">{safe(i.description)}</div>
                        <div className="text-xs text-muted-foreground">
                          {safe(i.start)} → {safe(i.end)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeInterruption(i.id)}
                        disabled={removingId === i.id}
                      >
                        {removingId === i.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                        Reabrir agora
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
