import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, ExternalLink, Copy, Store, StoreIcon } from "lucide-react";
import { getClientId } from "@/lib/getClientId";

const SETTING_KEY = "whatsapp_orders_number";
const CLOSED_KEY = "store_closed";

const WhatsAppAdmin = () => {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeClosed, setStoreClosed] = useState(false);
  const [togglingClosed, setTogglingClosed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const client_id = await getClientId();
        const [{ data: phoneRow }, { data: closedRow }] = await Promise.all([
          supabase
            .from("system_settings")
            .select("value")
            .eq("client_id", client_id)
            .eq("key", SETTING_KEY)
            .maybeSingle(),
          supabase
            .from("system_settings")
            .select("value")
            .eq("client_id", client_id)
            .eq("key", CLOSED_KEY)
            .maybeSingle(),
        ]);
        if (phoneRow?.value) setNumber(String(phoneRow.value));
        setStoreClosed(String(closedRow?.value ?? "false") === "true");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Informe um número válido com DDD");
      return;
    }
    setSaving(true);
    try {
      const client_id = await getClientId();
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("client_id", client_id)
        .eq("key", SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value: cleaned })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ key: SETTING_KEY, value: cleaned, client_id });
        if (error) throw error;
      }
      setNumber(cleaned);
      toast.success("Número salvo com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggleStoreClosed = async (next: boolean) => {
    setTogglingClosed(true);
    try {
      const client_id = await getClientId();
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("client_id", client_id)
        .eq("key", CLOSED_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value: String(next) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ key: CLOSED_KEY, value: String(next), client_id });
        if (error) throw error;
      }
      setStoreClosed(next);
      toast.success(next ? "Loja online FECHADA" : "Loja online ABERTA");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao atualizar: " + (e.message || ""));
    } finally {
      setTogglingClosed(false);
    }
  };

  const lojaUrl = "https://tarmfood.tarmsolution.com.br/loja";

  return (
    <AppLayout title="WhatsApp" subtitle="Configuração da loja online">
      <div className="space-y-6 max-w-2xl">
        <Card className={storeClosed ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {storeClosed ? (
                <StoreIcon className="w-5 h-5 text-destructive" />
              ) : (
                <Store className="w-5 h-5 text-green-600" />
              )}
              Status da Loja Online
            </CardTitle>
            <CardDescription>
              Quando a loja estiver <strong>fechada</strong>, os clientes não conseguirão enviar pedidos pelo WhatsApp.
              O sistema bloqueia o envio e não registra o pedido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30">
              <div>
                <p className="font-semibold">
                  {storeClosed ? "🚫 Loja FECHADA" : "✅ Loja ABERTA"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {storeClosed
                    ? "Pedidos estão bloqueados no site."
                    : "Pedidos estão sendo aceitos normalmente."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="store-closed" className="text-sm">
                  Fechar loja
                </Label>
                <Switch
                  id="store-closed"
                  checked={storeClosed}
                  onCheckedChange={toggleStoreClosed}
                  disabled={togglingClosed || loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Número que recebe os pedidos
            </CardTitle>
            <CardDescription>
              Os clientes do site (loja online) vão enviar os pedidos para este número de WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Número com DDD (com código do país opcional)</Label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex: 5511999999999"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 55 + DDD + número. Ex: <strong>5511999998888</strong>. Apenas números — espaços e símbolos serão removidos.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link da Loja Online</CardTitle>
            <CardDescription>
              Compartilhe este link nas suas redes sociais para que clientes façam pedidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={lojaUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(lojaUrl);
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(lojaUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default WhatsAppAdmin;
