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

interface Complement {
  id: string;
  name: string;
  price: number;
  category: "pasteis" | "salgados" | "acai";
  isSpecial: boolean;
  menuItemIds?: string[];
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

const Complements = () => {
  const navigate = useNavigate();
  const [complements, setComplements] = useState<Complement[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComplement, setEditingComplement] = useState<Complement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "pasteis" as "pasteis" | "salgados" | "acai",
    isSpecial: false,
    selectedMenuItems: [] as string[],
  });

  useEffect(() => {
    fetchComplements();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    const filtered = menuItems.filter(item => item.category === formData.category);
    setFilteredMenuItems(filtered);
  }, [formData.category, menuItems]);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, category")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error("Erro ao buscar itens do menu:", error);
    }
  };

  const fetchComplements = async () => {
    try {
      const { data, error } = await supabase
        .from("complements")
        .select(`
          *,
          complement_menu_items (
            menu_item_id
          )
        `)
        .eq("active", true)
        .order("category", { ascending: true });

      if (error) throw error;

      const formattedComplements = data?.map(comp => ({
        id: comp.id,
        name: comp.name,
        price: parseFloat(String(comp.price)),
        category: comp.category as "pasteis" | "salgados" | "acai",
        isSpecial: parseFloat(String(comp.price)) > 0,
        menuItemIds: comp.complement_menu_items?.map((rel: any) => rel.menu_item_id) || [],
      })) || [];

      setComplements(formattedComplements);
    } catch (error) {
      console.error("Erro ao buscar complementos:", error);
      toast.error("Erro ao carregar complementos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (complement?: Complement) => {
    if (complement) {
      setEditingComplement(complement);
      setFormData({
        name: complement.name,
        price: complement.price.toString(),
        category: complement.category,
        isSpecial: complement.isSpecial,
        selectedMenuItems: complement.menuItemIds || [],
      });
    } else {
      setEditingComplement(null);
      setFormData({
        name: "",
        price: "",
        category: "pasteis",
        isSpecial: false,
        selectedMenuItems: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do complemento é obrigatório");
      return;
    }

    if (formData.selectedMenuItems.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    const price = parseFloat(formData.price) || 0;
    setLoading(true);

    try {
      let complementId = editingComplement?.id;

      if (editingComplement) {
        // Atualizar complemento
        const { error } = await supabase
          .from("complements")
          .update({
            name: formData.name,
            price: price,
            category: formData.category,
          })
          .eq("id", editingComplement.id);

        if (error) throw error;

        // Remover vínculos antigos
        await supabase
          .from("complement_menu_items")
          .delete()
          .eq("complement_id", editingComplement.id);
      } else {
        // Criar novo complemento
        const { data, error } = await supabase
          .from("complements")
          .insert({
            name: formData.name,
            price: price,
            category: formData.category,
            active: true,
          })
          .select()
          .single();

        if (error) throw error;
        complementId = data.id;
      }

      // Criar novos vínculos
      if (complementId) {
        const links = formData.selectedMenuItems.map(menuItemId => ({
          complement_id: complementId,
          menu_item_id: menuItemId,
        }));

        const { error: linkError } = await supabase
          .from("complement_menu_items")
          .insert(links);

        if (linkError) throw linkError;
      }

      toast.success(editingComplement ? "Complemento atualizado com sucesso" : "Complemento cadastrado com sucesso");
      await fetchComplements();
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
      const { error } = await supabase
        .from("complements")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;

      await fetchComplements();
      toast.success("Complemento removido");
    } catch (error) {
      console.error("Erro ao remover complemento:", error);
      toast.error("Erro ao remover complemento");
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      pasteis: "bg-primary/10 text-primary",
      salgados: "bg-accent/10 text-accent",
      acai: "bg-warning/10 text-warning",
    };
    const labels = {
      pasteis: "Pastéis",
      salgados: "Salgados",
      acai: "Açaí",
    };
    return (
      <Badge className={colors[category as keyof typeof colors]}>
        {labels[category as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Gerenciar Complementos</h1>
                <p className="text-sm text-muted-foreground">
                  Configure complementos para pastéis, salgados e açaí
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Lista de Complementos</CardTitle>
            <CardDescription>
              Total de {complements.length} complemento(s) cadastrado(s)
            </CardDescription>
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
                         {getCategoryBadge(complement.category)}
                         {complement.isSpecial && (
                           <Badge variant="default">Especial</Badge>
                         )}
                       </div>
                       <p className="text-sm text-muted-foreground">
                         {complement.isSpecial
                           ? `R$ ${complement.price.toFixed(2)}`
                           : "Grátis"}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {complement.menuItemIds && complement.menuItemIds.length > 0
                           ? `Vinculado a ${complement.menuItemIds.length} produto(s)`
                           : "Sem produtos vinculados"}
                       </p>
                     </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDialog(complement)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(complement.id)}
                      >
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingComplement ? "Editar" : "Novo"} Complemento
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do complemento
            </DialogDescription>
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
                value={formData.category}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pasteis">Pastéis</SelectItem>
                  <SelectItem value="salgados">Salgados</SelectItem>
                  <SelectItem value="acai">Açaí</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isSpecial"
                checked={formData.isSpecial}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isSpecial: checked as boolean })
                }
              />
              <label
                htmlFor="isSpecial"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
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
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Produtos desta Categoria *</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {filteredMenuItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum produto cadastrado nesta categoria
                  </p>
                ) : (
                  filteredMenuItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={formData.selectedMenuItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedMenuItems: [...formData.selectedMenuItems, item.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedMenuItems: formData.selectedMenuItems.filter(
                                (id) => id !== item.id
                              ),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`item-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {formData.selectedMenuItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.selectedMenuItems.length} produto(s) selecionado(s)
                </p>
              )}
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
