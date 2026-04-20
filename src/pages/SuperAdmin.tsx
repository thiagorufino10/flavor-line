import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Plus, Building2, Trash2, Pencil, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  monthly_fee: number;
  due_day: number;
}

const emptyForm = {
  name: "",
  slug: "",
  notes: "",
  adminUsername: "admin",
  adminPassword: "",
  adminFullName: "",
  monthlyFee: "",
  dueDay: "5",
};

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { signOut, userName } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-clients", {
      body: { action: "list" },
    });
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Erro ao carregar clientes");
      setClients([]);
    } else {
      setClients(data.clients || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/super-admin/login");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      ...emptyForm,
      name: c.name,
      slug: c.slug,
      notes: c.notes || "",
      monthlyFee: String(c.monthly_fee ?? ""),
      dueDay: String(c.due_day ?? 5),
    });
    setDialogOpen(true);
  };

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do cliente");
    const finalSlug = (form.slug || slugify(form.name)).trim();
    if (!finalSlug) return toast.error("Slug inválido");

    setSaving(true);
    try {
      const monthlyFee = parseFloat(form.monthlyFee.replace(",", ".")) || 0;
      const dueDay = Math.min(31, Math.max(1, parseInt(form.dueDay) || 5));

      if (editing) {
        const { data, error } = await supabase.functions.invoke("manage-clients", {
          body: {
            action: "update",
            clientId: editing.id,
            name: form.name,
            slug: finalSlug,
            notes: form.notes || null,
            monthlyFee,
            dueDay,
          },
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message);
        toast.success("Cliente atualizado");
      } else {
        if (!form.adminUsername.trim() || !form.adminPassword.trim())
          return toast.error("Informe usuário e senha do admin inicial");
        const { data, error } = await supabase.functions.invoke("manage-clients", {
          body: {
            action: "create",
            name: form.name,
            slug: finalSlug,
            notes: form.notes || null,
            adminUsername: form.adminUsername,
            adminPassword: form.adminPassword,
            adminFullName: form.adminFullName || form.adminUsername,
            monthlyFee,
            dueDay,
          },
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message);
        toast.success(`Cliente "${form.name}" criado com usuário admin "${form.adminUsername}"`);
      }
      setDialogOpen(false);
      await fetchClients();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Client) => {
    const { data, error } = await supabase.functions.invoke("manage-clients", {
      body: { action: "update", clientId: c.id, active: !c.active },
    });
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao atualizar status");
      return;
    }
    toast.success(c.active ? "Cliente desativado" : "Cliente ativado");
    fetchClients();
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(`Excluir cliente "${c.name}" e TODOS os seus dados? Esta ação é irreversível.`)) return;
    const { data, error } = await supabase.functions.invoke("manage-clients", {
      body: { action: "delete", clientId: c.id },
    });
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao excluir cliente");
      return;
    }
    toast.success("Cliente excluído");
    fetchClients();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel TARM Solution</h1>
              <p className="text-sm text-muted-foreground">{userName} · Super-Admin</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Clientes do TARMFood</h2>
            <p className="text-sm text-muted-foreground">Gerencie os estabelecimentos que usam o sistema</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Novo cliente
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              Nenhum cliente cadastrado ainda. Clique em "Novo cliente" para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c) => (
              <Card key={c.id} className={c.active ? "" : "opacity-60"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{c.name}</CardTitle>
                      <CardDescription className="truncate">slug: {c.slug}</CardDescription>
                    </div>
                    <Badge variant={c.active ? "default" : "secondary"}>
                      {c.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-xs text-muted-foreground">Mensalidade</p>
                      <p className="font-semibold">
                        {(c.monthly_fee ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p className="font-semibold">Dia {c.due_day ?? 5}</p>
                    </div>
                  </div>
                  {c.notes && <p className="text-sm text-muted-foreground line-clamp-2">{c.notes}</p>}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do cliente."
                : "Cadastre o cliente e o usuário administrador inicial. Esse admin já poderá fazer login no sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do cliente</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                placeholder="Ex: Pastel do João"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (identificador interno)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="ex: pastel-do-joao"
              />
              <p className="text-xs text-muted-foreground">Usado internamente para os e-mails técnicos. Sem espaços.</p>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mensalidade (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.monthlyFee}
                  onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                  placeholder="Ex: 149,90"
                />
              </div>
              <div className="space-y-2">
                <Label>Dia do vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                  placeholder="Ex: 5"
                />
              </div>
            </div>
            {!editing && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <p className="text-sm font-semibold">Usuário admin inicial</p>
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={form.adminFullName}
                    onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Input
                      value={form.adminUsername}
                      onChange={(e) => setForm({ ...form, adminUsername: e.target.value.toLowerCase() })}
                      placeholder="admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                      type="text"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdmin;
