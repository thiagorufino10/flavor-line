import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UtensilsCrossed, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";

type ProductCategory = "pasteis" | "salgados" | "acai" | "bebidas" | "doces" | "coxinha" | "cachorro_quente";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  description?: string;
}

const Menu = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const emptyForm = {
    id: "",
    name: "",
    price: "",
    category: "pasteis" as ProductCategory,
    description: "",
  };

  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("active", true)
        .order("category", { ascending: true });

      if (error) throw error;

      const formattedItems = data?.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(String(item.price)),
        category: item.category as ProductCategory,
        description: item.description || undefined,
      })) || [];

      setItems(formattedItems);
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
      toast.error("Erro ao carregar cardápio");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Preço inválido");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("menu_items").insert({
        name: formData.name,
        price,
        category: formData.category,
        description: formData.description || null,
        active: true,
      });
      if (error) throw error;
      toast.success("Item criado com sucesso!");
      await fetchMenuItems();
      setFormData(emptyForm);
    } catch (error) {
      console.error("Erro ao criar item:", error);
      toast.error("Erro ao criar item");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editFormData.name || !editFormData.price || !editFormData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const price = parseFloat(editFormData.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Preço inválido");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({
          name: editFormData.name,
          price,
          category: editFormData.category,
          description: editFormData.description || null,
        })
        .eq("id", editFormData.id);
      if (error) throw error;
      toast.success("Item atualizado com sucesso!");
      await fetchMenuItems();
      setEditModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      toast.error("Erro ao atualizar item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditFormData({
      id: item.id,
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      description: item.description || "",
    });
    setEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
      await fetchMenuItems();
      toast.success("Item excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao excluir item");
    }
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pasteis: { variant: "default", label: "Pastéis" },
      salgados: { variant: "secondary", label: "Salgados" },
      acai: { variant: "destructive", label: "Açaí" },
      bebidas: { variant: "outline", label: "Bebidas" },
      doces: { variant: "default", label: "Doces" },
      coxinha: { variant: "secondary", label: "Coxinha" },
      cachorro_quente: { variant: "destructive", label: "Cachorro Quente" },
    };
    const config = variants[category] || variants.pasteis;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cardápio</h1>
            <p className="text-muted-foreground">Gerencie os itens do cardápio</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Item *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pastel de Carne"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pasteis">Pastéis</SelectItem>
                  <SelectItem value="salgados">Salgados</SelectItem>
                  <SelectItem value="acai">Açaí</SelectItem>
                  <SelectItem value="bebidas">Bebidas</SelectItem>
                  <SelectItem value="doces">Doces</SelectItem>
                  <SelectItem value="coxinha">Coxinha</SelectItem>
                  <SelectItem value="cachorro_quente">Cachorro Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="8.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Carne moída temperada"
              />
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" /> Criar
            </Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Itens do Cardápio</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum item cadastrado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(item.category)}</TableCell>
                      <TableCell className="font-medium">{formatBRL(item.price)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Item *</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={editFormData.category} onValueChange={(value: any) => setEditFormData({ ...editFormData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pasteis">Pastéis</SelectItem>
                  <SelectItem value="salgados">Salgados</SelectItem>
                  <SelectItem value="acai">Açaí</SelectItem>
                  <SelectItem value="bebidas">Bebidas</SelectItem>
                  <SelectItem value="doces">Doces</SelectItem>
                  <SelectItem value="coxinha">Coxinha</SelectItem>
                  <SelectItem value="cachorro_quente">Cachorro Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editFormData.price}
                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={loading}>Atualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Menu;
