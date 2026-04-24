import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Trash2, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Footer from "@/components/Footer";

interface TableRow {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

const TablesAdmin = () => {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTables = async () => {
    const { data, error } = await supabase
      .from("tables")
      .select("id, name, active, sort_order")
      .order("sort_order")
      .order("name");
    if (error) {
      toast.error("Erro ao carregar mesas");
    } else {
      setTables(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTables(); }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (t: TableRow) => {
    setEditing(t);
    setName(t.name);
    setActive(t.active);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da mesa");
      return;
    }
    if (!clientId) {
      toast.error("Cliente não identificado");
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("tables")
        .update({ name: name.trim(), active })
        .eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Mesa atualizada");
    } else {
      const nextOrder = (tables[tables.length - 1]?.sort_order ?? 0) + 1;
      const { error } = await supabase
        .from("tables")
        .insert({ name: name.trim(), active, sort_order: nextOrder, client_id: clientId });
      if (error) { toast.error("Erro ao criar mesa"); return; }
      toast.success("Mesa criada");
    }
    setDialogOpen(false);
    fetchTables();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("tables").delete().eq("id", deleteId);
    if (error) {
      toast.error("Não foi possível excluir (mesa em uso?)");
    } else {
      toast.success("Mesa excluída");
      fetchTables();
    }
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mesas</h1>
              <p className="text-sm text-muted-foreground">Cadastre e gerencie as mesas do estabelecimento</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nova mesa
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Mesas cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando...</div>
            ) : tables.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhuma mesa cadastrada ainda. Clique em "Nova mesa".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{t.name}</div>
                      <Badge variant={t.active ? "secondary" : "outline"}>
                        {t.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar mesa" : "Nova mesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome / número</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mesa 1, Varanda 3, Balcão"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Mesas com sessões registradas não podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default TablesAdmin;
