import { useState } from "react";
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
import { Users as UsersIcon, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "atendente" | "cozinha";
}

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("users");
    return saved ? JSON.parse(saved) : [
      { id: "1", username: "admin", name: "Administrador", role: "admin" },
      { id: "2", username: "atendente", name: "João Silva", role: "atendente" },
      { id: "3", username: "cozinha", name: "Maria Santos", role: "cozinha" },
    ];
  });

  const [formData, setFormData] = useState({
    id: "",
    username: "",
    name: "",
    role: "atendente" as "admin" | "atendente" | "cozinha",
    password: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (!formData.username || !formData.name || !formData.role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!isEditing && !formData.password) {
      toast.error("Senha é obrigatória para novos usuários");
      return;
    }

    let updatedUsers: User[];

    if (isEditing) {
      updatedUsers = users.map(user =>
        user.id === formData.id
          ? { id: user.id, username: formData.username, name: formData.name, role: formData.role }
          : user
      );
      toast.success("Usuário atualizado com sucesso!");
    } else {
      const newUser: User = {
        id: Math.random().toString(),
        username: formData.username,
        name: formData.name,
        role: formData.role,
      };
      updatedUsers = [...users, newUser];
      toast.success("Usuário criado com sucesso!");
    }

    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    handleReset();
  };

  const handleEdit = (user: User) => {
    setFormData({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      password: "",
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.username === "admin") {
      toast.error("Não é possível excluir o usuário administrador principal");
      return;
    }

    const updatedUsers = users.filter(user => user.id !== id);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    toast.success("Usuário excluído com sucesso!");
  };

  const handleReset = () => {
    setFormData({
      id: "",
      username: "",
      name: "",
      role: "atendente",
      password: "",
    });
    setIsEditing(false);
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
            <CardTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="usuario123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João da Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Perfil *</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
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
              <Label htmlFor="password">
                Senha {!isEditing && "*"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEditing ? "Deixe em branco para manter" : "Digite a senha"}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {isEditing ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Criar</>}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={handleReset}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.username === "admin"}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;
