import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bike, Plus, Trash2, Save } from "lucide-react";
import { getClientId } from "@/lib/getClientId";
import { formatBRL } from "@/lib/format";

interface Neighborhood {
  id: string;
  name: string;
  delivery_fee: number;
  active: boolean;
}

const DeliveryAdmin = () => {
  const [list, setList] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_neighborhoods")
      .select("id,name,delivery_fee,active")
      .order("name");
    if (error) toast.error("Erro ao carregar bairros");
    setList((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    const fee = parseFloat(newFee.replace(",", "."));
    if (!name) return toast.error("Informe o nome do bairro");
    if (!Number.isFinite(fee) || fee < 0) return toast.error("Informe um valor válido");

    try {
      const client_id = await getClientId();
      const { error } = await supabase
        .from("delivery_neighborhoods")
        .insert({ name, delivery_fee: fee, client_id });
      if (error) throw error;
      setNewName("");
      setNewFee("");
      toast.success("Bairro adicionado!");
      load();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || ""));
    }
  };

  const updateField = (id: string, field: keyof Neighborhood, value: any) => {
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const handleSave = async (n: Neighborhood) => {
    const { error } = await supabase
      .from("delivery_neighborhoods")
      .update({ name: n.name, delivery_fee: n.delivery_fee, active: n.active })
      .eq("id", n.id);
    if (error) return toast.error("Erro ao salvar");
    toast.success("Salvo!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este bairro?")) return;
    const { error } = await supabase.from("delivery_neighborhoods").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    toast.success("Removido");
    load();
  };

  return (
    <AppLayout title="Delivery" subtitle="Bairros atendidos e taxas de entrega">
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Adicionar bairro
            </CardTitle>
            <CardDescription>
              Cadastre os bairros que sua loja atende e o valor da entrega para cada um.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
              <div>
                <Label>Nome do bairro</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Jardim Baixo"
                />
              </div>
              <div>
                <Label>Taxa de entrega (R$)</Label>
                <Input
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-primary" />
              Bairros cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum bairro cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {list.map((n) => (
                  <div
                    key={n.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto_auto_auto] gap-2 items-center border rounded-lg p-3"
                  >
                    <Input
                      value={n.name}
                      onChange={(e) => updateField(n.id, "name", e.target.value)}
                    />
                    <Input
                      value={String(n.delivery_fee)}
                      onChange={(e) =>
                        updateField(n.id, "delivery_fee", parseFloat(e.target.value.replace(",", ".")) || 0)
                      }
                      inputMode="decimal"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={n.active}
                        onCheckedChange={(v) => updateField(n.id, "active", v)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {n.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleSave(n)}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(n.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <p className="col-span-full text-xs text-muted-foreground">
                      Preview: {formatBRL(n.delivery_fee)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DeliveryAdmin;
