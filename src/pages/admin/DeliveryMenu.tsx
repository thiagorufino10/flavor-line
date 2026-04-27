import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Bike } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatBRL } from "@/lib/format";
import { getDeliveryImage } from "@/lib/deliveryImages";

interface DeliveryItem {
  id: string;
  product_key: string;
  kind: "pastel" | "drink";
  name: string;
  description: string | null;
  prices: any;
  sort_order: number;
  active: boolean;
}

const SIZES = ["P", "M", "G", "GG"] as const;

const DeliveryMenu = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_menu_items")
      .select("*")
      .order("kind")
      .order("sort_order");
    if (error) {
      toast.error("Erro ao carregar cardápio: " + error.message);
    } else {
      setItems((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const pasteis = useMemo(() => items.filter((i) => i.kind === "pastel"), [items]);
  const drinks = useMemo(() => items.filter((i) => i.kind === "drink"), [items]);

  const updateLocal = (id: string, patch: Partial<DeliveryItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const updatePrice = (id: string, key: string, value: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const prices = { ...(item.prices || {}), [key]: Number(value) || 0 };
    updateLocal(id, { prices });
  };

  const save = async (item: DeliveryItem) => {
    setSaving(item.id);
    const { error } = await supabase
      .from("delivery_menu_items")
      .update({
        name: item.name,
        description: item.description,
        prices: item.prices,
        active: item.active,
      })
      .eq("id", item.id);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(`${item.name} atualizado!`);
    }
  };

  const renderPastel = (item: DeliveryItem) => (
    <Card key={item.id} className="overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div className="w-full sm:w-32 h-32 shrink-0 rounded-md overflow-hidden bg-muted">
          {getDeliveryImage(item.product_key) && (
            <img
              src={getDeliveryImage(item.product_key)}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={item.name}
                onChange={(e) => updateLocal(item.id, { name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                checked={item.active}
                onCheckedChange={(v) => updateLocal(item.id, { active: v })}
              />
              <span className="text-xs">{item.active ? "Ativo" : "Oculto"}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input
              value={item.description || ""}
              onChange={(e) => updateLocal(item.id, { description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SIZES.map((s) => (
              <div key={s}>
                <Label className="text-xs text-muted-foreground">
                  Preço {s}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.prices?.[s] ?? 0}
                  onChange={(e) => updatePrice(item.id, s, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => save(item)}
              disabled={saving === item.id}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving === item.id ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderDrink = (item: DeliveryItem) => (
    <Card key={item.id} className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <div className="w-24 h-24 shrink-0 rounded-md overflow-hidden bg-muted">
          {getDeliveryImage(item.product_key) && (
            <img
              src={getDeliveryImage(item.product_key)}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={item.name}
                onChange={(e) => updateLocal(item.id, { name: e.target.value })}
              />
            </div>
            <div className="w-32">
              <Label className="text-xs text-muted-foreground">Preço</Label>
              <Input
                type="number"
                step="0.01"
                value={item.prices?.price ?? 0}
                onChange={(e) => updatePrice(item.id, "price", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={item.active}
                onCheckedChange={(v) => updateLocal(item.id, { active: v })}
              />
              <span className="text-xs">{item.active ? "Ativo" : "Oculto"}</span>
            </div>
            <Button
              size="sm"
              onClick={() => save(item)}
              disabled={saving === item.id}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Bike className="w-6 h-6 text-primary" />
                Cardápio Delivery
              </h1>
              <p className="text-sm text-muted-foreground">
                Edite os preços e nomes dos itens exibidos no site de delivery.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pastéis / Batatas
                  <Badge variant="secondary">{pasteis.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pasteis.map(renderPastel)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Bebidas
                  <Badge variant="secondary">{drinks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drinks.map(renderDrink)}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default DeliveryMenu;
