import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Pencil, Sparkles, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getClientId } from "@/lib/getClientId";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

const Categories = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", sort_order: 0 });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", sort_order: items.length });
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, sort_order: c.sort_order });
    setDialogOpen(true);
  };

  const generateImage = async (categoryId: string, categoryName: string) => {
    const { data, error } = await supabase.functions.invoke("generate-category-image", {
      body: { categoryId, categoryName },
    });
    if (error) {
      throw new Error(error.message || "Falha ao gerar imagem");
    }
    if ((data as any)?.error) {
      throw new Error((data as any).error);
    }
    return (data as any)?.imageUrl as string;
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome da categoria");
      return;
    }
    setBusy(true);
    try {
      const client_id = await getClientId();
      const slug = slugify(name);

      if (editing) {
        const { error } = await supabase
          .from("categories")
          .update({ name, slug, sort_order: form.sort_order })
          .eq("id", editing.id);
        if (error) throw error;

        // Se nome mudou, regenera imagem
        if (editing.name !== name) {
          toast.info("Gerando nova imagem com IA...");
          await generateImage(editing.id, name);
        }
        toast.success("Categoria atualizada");
      } else {
        const { data, error } = await supabase
          .from("categories")
          .insert({
            client_id,
            name,
            slug,
            sort_order: form.sort_order,
          })
          .select()
          .single();
        if (error) throw error;

        toast.info("Gerando imagem com IA...");
        await generateImage(data.id, name);
        toast.success("Categoria criada com imagem!");
      }
      setDialogOpen(false);
      await fetchCategories();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async (c: Category) => {
    setBusy(true);
    try {
      toast.info(`Gerando nova imagem para "${c.name}"...`);
      await generateImage(c.id, c.name);
      toast.success("Imagem atualizada");
      await fetchCategories();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao gerar imagem");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (c: Category) => {
    if (!confirm(`Excluir a categoria "${c.name}"? Itens vinculados precisam ser realocados antes.`)) return;
    try {
      const { error } = await supabase.from("categories").delete().eq("id", c.id);
      if (error) {
        if (error.code === "23503") {
          toast.error("Existem itens do cardápio ou complementos vinculados a esta categoria.");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Categoria excluída");
      await fetchCategories();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir categoria");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Categorias</h1>
              <p className="text-sm text-muted-foreground">
                Crie suas próprias categorias — a IA gera uma imagem ilustrativa para cada uma
              </p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Categoria
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Suas categorias ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-3">
                <ImagePlus className="w-10 h-10 mx-auto opacity-50" />
                <p>Nenhuma categoria cadastrada ainda.</p>
                <Button onClick={openNew} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar primeira categoria
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((c) => (
                  <Card key={c.id} className="overflow-hidden">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImagePlus className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Ordem: {c.sort_order}</p>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => handleRegenerate(c)}
                          disabled={busy}
                          title="Regenerar imagem com IA"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openEdit(c)}
                          disabled={busy}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDelete(c)}
                          disabled={busy}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(o) => !busy && setDialogOpen(o)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Ao trocar o nome, uma nova imagem será gerada automaticamente."
                : "A IA vai gerar uma imagem ilustrativa baseada no nome."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Pizzas, Hambúrgueres, Sucos..."
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value || "0", 10) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={busy} className="gap-2">
              {busy ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Gerando imagem...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {editing ? "Salvar" : "Criar com IA"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
