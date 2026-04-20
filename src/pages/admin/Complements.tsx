import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL } from "@/lib/format";

interface CategoryRow {
  id: string;
  name: string;
}

interface Complement {
  id: string;
  name: string;
  price: number;
  category_id: string;
  isSpecial: boolean;
  linkedItems?: string[];
}

interface MenuItem {
  id: string;
  name: string;
  category_id: string;
}

const Complements = () => {
  const navigate = useNavigate();
  const [complements, setComplements] = useState<Complement[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComplement, setEditingComplement] = useState<Complement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category_id: "",
    isSpecial: false,
    linkedItems: [] as string[],
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catRes, miRes, compRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
        supabase.from("menu_items").select("id, name, category_id").eq("active", true).order("name"),
        supabase
          .from("complements")
          .select(`*, complement_menu_items(menu_item_id)`)
          .eq("active", true),
      ]);
      if (catRes.error) throw catRes.error;
      if (miRes.error) throw miRes.error;
      if (compRes.error) throw compRes.error;

      setCategories(catRes.data || []);
      setMenuItems((miRes.data || []) as any);

      const formatted = (compRes.data || []).map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        price: parseFloat(String(comp.price)),
        category_id: comp.category_id,
        isSpecial: parseFloat(String(comp.price)) > 0,
        linkedItems: comp.complement_menu_items?.map((link: any) => link.menu_item_id) || [],
      }));
      setComplements(formatted);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar complementos");
    } finally {
      setLoading(false);
    }
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || "—";

  const handleOpenDialog = (complement?: Complement) => {
    if (complement) {
      setEditingComplement(complement);
      setFormData({
        name: complement.name,
        price: complement.price.toString(),
        category_id: complement.category_id,
        isSpecial: complement.isSpecial,
        linkedItems: complement.linkedItems || [],
      });
    } else {
      setEditingComplement(null);
      setFormData({
        name: "",
        price: "",
        category_id: categories[0]?.id || "",
        isSpecial: false,
        linkedItems: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do complemento é obrigatório");
      return;
    }
    if (!formData.category_id) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (formData.linkedItems.length === 0) {
      toast.error("Selecione pelo menos um produto para vincular");
      return;
    }

    const price = parseFloat(formData.price) || 0;
    setLoading(true);

    try {
      let complementId = editingComplement?.id;
      const { getClientId } = await import("@/lib/getClientId");
      const client_id = await getClientId();

      if (editingComplement) {
        const { error } = await supabase
          .from("complements")
          .update({
            name: formData.name,
            price: price,
            category_id: formData.category_id,
          })
          .eq("id", editingComplement.id);
        if (error) throw error;

        await supabase.from("complement_menu_items").delete().eq("complement_id", editingComplement.id);
      } else {
        const { data, error } = await supabase
          .from("complements")
          .insert({
            client_id,
            name: formData.name,
            price: price,
            category_id: formData.category_id,
            active: true,
          })
          .select()
          .single();
        if (error) throw error;
        complementId = data.id;
      }

      if (complementId && formData.linkedItems.length > 0) {
        const links = formData.linkedItems.map((menuItemId) => ({
          client_id,
          complement_id: complementId!,
          menu_item_id: menuItemId,
        }));
        const { error: linkError } = await supabase.from("complement_menu_items").insert(links);
        if (linkError) throw linkError;
      }

      toast.success(editingComplement ? "Complemento atualizado com sucesso" : "Complemento cadastrado com sucesso");
      await fetchAll();
      setDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar complemento:", error);
      toast.error("Erro ao salvar complemento");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("complements").update({ active: false }).eq("id", id);
      if (error) throw error;
      await fetchAll();
      toast.success("Complemento removido");
    } catch (error) {
      console.error("Erro ao remover complemento:", error);
      toast.error("Erro ao remover complemento");
    }
  };

  if (categories.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Complementos</h1>
          <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">
              Cadastre pelo menos uma categoria antes de criar complementos.
            </p>
            <Button onClick={() => navigate("/admin/categories")}>Ir para Categorias</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Gerenciar Complementos</h1>
                <p className="text-sm text-muted-foreground">
                  Configure complementos e vincule aos produtos
                </p>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Complemento
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Lista de Complementos</CardTitle>
            <CardDescription>Total de {complements.length} complemento(s) cadastrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : complements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum complemento cadastrado ainda
              </div>
            ) : (
              <div className="space-y-3">
                {complements.map((complement) => (
                  <div
                    key={complement.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{complement.name}</span>
                        <Badge variant="secondary">{categoryName(complement.category_id)}</Badge>
                        {complement.isSpecial && <Badge variant="default">Especial</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {complement.isSpecial ? formatBRL(complement.price) : "Grátis"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vinculado a {complement.linkedItems?.length || 0} produto(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(complement)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(complement.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingComplement ? "Editar" : "Novo"} Complemento</DialogTitle>
            <DialogDescription>Preencha os dados e vincule aos produtos</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Complemento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ketchup, Batata Frita"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value, linkedItems: [] })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isSpecial"
                checked={formData.isSpecial}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    isSpecial: checked as boolean,
                    price: checked ? formData.price : "0",
                  })
                }
              />
              <label htmlFor="isSpecial" className="text-sm font-medium leading-none">
                Complemento Especial (cobra valor adicional)
              </label>
            </div>

            {formData.isSpecial && (
              <div className="space-y-2">
                <Label htmlFor="price">Preço Adicional (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="space-y-3">
              <Label>Produtos Vinculados *</Label>
              <p className="text-xs text-muted-foreground">
                Selecione os produtos desta categoria que terão este complemento disponível
              </p>
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                {menuItems
                  .filter((item) => item.category_id === formData.category_id)
                  .map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={formData.linkedItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              linkedItems: [...formData.linkedItems, item.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              linkedItems: formData.linkedItems.filter((id) => id !== item.id),
                            });
                          }
                        }}
                      />
                      <label htmlFor={`item-${item.id}`} className="text-sm font-medium cursor-pointer">
                        {item.name}
                      </label>
                    </div>
                  ))}
                {menuItems.filter((item) => item.category_id === formData.category_id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum produto cadastrado nesta categoria
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {editingComplement ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Complements;
