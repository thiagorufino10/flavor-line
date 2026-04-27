import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, ExternalLink, Copy } from "lucide-react";
import { getClientId } from "@/lib/getClientId";

const SETTING_KEY = "whatsapp_orders_number";

const WhatsAppAdmin = () => {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      if (data?.value) setNumber(String(data.value));
      setLoading(false);
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

  const lojaUrl = `${window.location.origin}/loja`;

  return (
    <AppLayout title="WhatsApp" subtitle="Configuração da loja online">
      <div className="space-y-6 max-w-2xl">
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
