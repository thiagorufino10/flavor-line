import { useState } from "react";
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
}

const Complements = () => {
  const navigate = useNavigate();
  const [complements, setComplements] = useState<Complement[]>([
    { id: "1", name: "Ketchup", price: 0, category: "pasteis", isSpecial: false },
    { id: "2", name: "Mostarda", price: 0, category: "pasteis", isSpecial: false },
    { id: "3", name: "Batata Frita", price: 5.00, category: "pasteis", isSpecial: true },
    { id: "4", name: "Queijo Extra", price: 3.00, category: "pasteis", isSpecial: true },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComplement, setEditingComplement] = useState<Complement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "pasteis" as "pasteis" | "salgados" | "acai",
    isSpecial: false,
  });

  const handleOpenDialog = (complement?: Complement) => {
    if (complement) {
      setEditingComplement(complement);
      setFormData({
        name: complement.name,
        price: complement.price.toString(),
        category: complement.category,
        isSpecial: complement.isSpecial,
      });
    } else {
      setEditingComplement(null);
      setFormData({
        name: "",
        price: "",
        category: "pasteis",
        isSpecial: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nome do complemento é obrigatório");
      return;
    }

    const price = parseFloat(formData.price) || 0;

    if (editingComplement) {
      setComplements(complements.map(c => 
        c.id === editingComplement.id
          ? { ...c, ...formData, price }
          : c
      ));
      toast.success("Complemento atualizado com sucesso");
    } else {
      const newComplement: Complement = {
        id: Math.random().toString(),
        name: formData.name,
        price,
        category: formData.category,
        isSpecial: formData.isSpecial,
      };
      setComplements([...complements, newComplement]);
      toast.success("Complemento cadastrado com sucesso");
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setComplements(complements.filter(c => c.id !== id));
    toast.success("Complemento removido");
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
            {complements.length === 0 ? (
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingComplement ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Complements;
