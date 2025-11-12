import { useState, useEffect } from "react";
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
import { Users as UsersIcon, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  role: "admin" | "atendente" | "cozinha";
}

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    role: "atendente" as "admin" | "atendente" | "cozinha",
    password: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "list" }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setUsers(result.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username || !formData.full_name || !formData.role || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const email = `${formData.username}@pastelfavorite.local`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
            userData: {
              email,
              password: formData.password,
              full_name: formData.full_name,
              role: formData.role,
            },
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Usuário criado com sucesso!");
      handleReset();
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.message?.includes("already") || error.message?.includes("duplicate")) {
        toast.error("Este usuário já está cadastrado");
      } else {
        toast.error("Erro ao criar usuário: " + (error.message || "Erro desconhecido"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (username === "admin") {
      toast.error("Não é possível excluir o usuário administrador principal");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "delete",
            userData: { userId: id },
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Usuário excluído com sucesso!");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário");
    }
  };

  const handleReset = () => {
    setFormData({
      username: "",
      full_name: "",
      role: "atendente",
      password: "",
    });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      admin: { variant: "destructive", label: "Administrador" },
      atendente: { variant: "default", label: "Atendente" },
      cozinha: { variant: "secondary", label: "Cozinha" },
    };
    const config = variants[role] || variants.atendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Usuários e Perfis</h1>
            <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                placeholder="admin"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Apenas letras minúsculas e números</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Administrador"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Perfil *</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="cozinha">Cozinha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={user.username === "admin"}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;
