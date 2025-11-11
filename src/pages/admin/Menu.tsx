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
import { UtensilsCrossed, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: "pasteis" | "salgados" | "acai" | "bebidas";
  description?: string;
}

const Menu = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem("menuItems");
    return saved ? JSON.parse(saved) : [
      { id: "1", name: "Pastel de Carne", price: 8.00, category: "pasteis", description: "Carne moída temperada" },
      { id: "2", name: "Pastel de Queijo", price: 7.00, category: "pasteis", description: "Queijo mussarela" },
      { id: "3", name: "Coxinha", price: 6.00, category: "salgados", description: "Frango desfiado" },
      { id: "4", name: "Açaí 300ml", price: 12.00, category: "acai" },
      { id: "5", name: "Refrigerante", price: 5.00, category: "bebidas" },
    ];
  });

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    price: "",
    category: "pasteis" as "pasteis" | "salgados" | "acai" | "bebidas",
    description: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Preço inválido");
      return;
    }

    let updatedItems: MenuItem[];

    if (isEditing) {
      updatedItems = items.map(item =>
        item.id === formData.id
          ? { ...item, name: formData.name, price, category: formData.category, description: formData.description }
          : item
      );
      toast.success("Item atualizado com sucesso!");
    } else {
      const newItem: MenuItem = {
        id: Math.random().toString(),
        name: formData.name,
        price,
        category: formData.category,
        description: formData.description,
      };
      updatedItems = [...items, newItem];
      toast.success("Item criado com sucesso!");
    }

    localStorage.setItem("menuItems", JSON.stringify(updatedItems));
    setItems(updatedItems);
    handleReset();
  };

  const handleEdit = (item: MenuItem) => {
    setFormData({
      id: item.id,
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      description: item.description || "",
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    localStorage.setItem("menuItems", JSON.stringify(updatedItems));
    setItems(updatedItems);
    toast.success("Item excluído com sucesso!");
  };

  const handleReset = () => {
    setFormData({
      id: "",
      name: "",
      price: "",
      category: "pasteis",
      description: "",
    });
    setIsEditing(false);
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pasteis: { variant: "default", label: "Pastéis" },
      salgados: { variant: "secondary", label: "Salgados" },
      acai: { variant: "destructive", label: "Açaí" },
      bebidas: { variant: "outline", label: "Bebidas" },
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
        <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Item" : "Novo Item"}</CardTitle>
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
            <CardTitle>Itens do Cardápio</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell className="font-medium">R$ {item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
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

export default Menu;
