import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Plus, Image as ImageIcon, Save, DollarSign, Power, Upload, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Catalog = { catalogId: string; context?: string; status?: string; modulationGroup?: string };
type Category = {
  id: string;
  name: string;
  status?: string;
  index?: number;
  template?: string;
  externalCode?: string | null;
  items?: any[];
};

async function call(action: string, payload: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("ifood-catalog", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (!(data as any)?.ok) {
    const code = (data as any)?.code ?? "Erro";
    const msg = (data as any)?.message ?? "Falha na requisição";
    throw new Error(`${code}: ${msg}`);
  }
  return (data as any).data;
}

export function IfoodCatalogPanel() {
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Nova categoria
  const [catName, setCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Item (criar/editar)
  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemValue, setItemValue] = useState<string>("");
  const [itemImagePath, setItemImagePath] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Patch preço/status item
  const [patchItemId, setPatchItemId] = useState("");
  const [patchItemPrice, setPatchItemPrice] = useState("");
  const [patchItemStatus, setPatchItemStatus] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");

  // Patch preço/status complemento
  const [optionId, setOptionId] = useState("");
  const [optionPrice, setOptionPrice] = useState("");
  const [optionStatus, setOptionStatus] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");

  // Upload imagem
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState("");

  const loadCatalogs = async () => {
    setLoading(true);
    try {
      const data = await call("list_catalogs");
      const list: Catalog[] = Array.isArray(data) ? data : (data?.catalogs ?? []);
      setCatalogs(list);
      if (list.length && !selectedCatalog) setSelectedCatalog(list[0].catalogId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!selectedCatalog) return;
    setLoading(true);
    try {
      const data = await call("list_categories", { catalogId: selectedCatalog, includeItems: true });
      const list: Category[] = Array.isArray(data) ? data : (data?.categories ?? []);
      setCategories(list);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCatalogs(); }, []);
  useEffect(() => { if (selectedCatalog) loadCategories(); }, [selectedCatalog]);

  const handleCreateCategory = async () => {
    if (!selectedCatalog || !catName.trim()) {
      toast.error("Selecione um catálogo e informe o nome");
      return;
    }
    setSavingCat(true);
    try {
      await call("create_category", {
        catalogId: selectedCatalog,
        name: catName.trim(),
        status: "AVAILABLE",
        index: categories.length,
        template: "DEFAULT",
      });
      toast.success("Categoria criada");
      setCatName("");
      loadCategories();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingCat(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const data = await call("upload_image", { image: base64 });
      const path = data?.path ?? data?.imagePath ?? data?.url ?? JSON.stringify(data);
      setUploadedPath(path);
      setItemImagePath(path);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpsertItem = async () => {
    if (!selectedCategory || !itemName.trim() || !itemValue) {
      toast.error("Categoria, nome e preço são obrigatórios");
      return;
    }
    setSavingItem(true);
    try {
      const item: any = {
        item: {
          id: itemId || undefined, // se omitido, iFood cria
          status: "AVAILABLE",
          price: { value: Number(itemValue) },
          categoryId: selectedCategory,
          product: {
            name: itemName.trim(),
            description: itemDesc.trim() || undefined,
            image: itemImagePath ? { path: itemImagePath } : undefined,
          },
        },
      };
      const data = await call("upsert_item", item);
      const newId = data?.id ?? data?.itemId;
      if (newId) setItemId(newId);
      toast.success("Item salvo");
      loadCategories();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingItem(false);
    }
  };

  const handlePatchItemPrice = async () => {
    if (!patchItemId || !patchItemPrice) {
      toast.error("itemId e preço obrigatórios");
      return;
    }
    try {
      await call("update_item_price", {
        itemId: patchItemId,
        price: { value: Number(patchItemPrice) },
      });
      toast.success("Preço atualizado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePatchItemStatus = async () => {
    if (!patchItemId) {
      toast.error("itemId obrigatório");
      return;
    }
    try {
      await call("update_item_status", { itemId: patchItemId, status: patchItemStatus });
      toast.success("Status atualizado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePatchOptionPrice = async () => {
    if (!optionId || !optionPrice) {
      toast.error("optionId e preço obrigatórios");
      return;
    }
    try {
      await call("update_option_price", {
        optionId,
        price: { value: Number(optionPrice) },
      });
      toast.success("Preço do complemento atualizado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePatchOptionStatus = async () => {
    if (!optionId) {
      toast.error("optionId obrigatório");
      return;
    }
    try {
      await call("update_option_status", { optionId, status: optionStatus });
      toast.success("Status do complemento atualizado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copiado");
  };

  return (
    <div className="space-y-4">
      {/* CATÁLOGOS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Catálogos</CardTitle>
            <CardDescription>GET /merchants/{`{merchantId}`}/catalogs</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadCatalogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {catalogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum catálogo encontrado.</p>
          ) : (
            <div className="grid gap-2">
              {catalogs.map((c) => (
                <div
                  key={c.catalogId}
                  className={`flex items-center justify-between p-3 rounded border cursor-pointer ${
                    selectedCatalog === c.catalogId ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelectedCatalog(c.catalogId)}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs truncate">{c.catalogId}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.context ?? "—"} · {c.status ?? "—"}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); copy(c.catalogId); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CATEGORIAS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias</CardTitle>
          <CardDescription>
            GET/POST /merchants/{`{merchantId}`}/catalogs/{`{catalogId}`}/categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova categoria"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
            <Button onClick={handleCreateCategory} disabled={savingCat || !selectedCatalog}>
              {savingCat ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar
            </Button>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria.</p>
          ) : (
            <div className="grid gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded border cursor-pointer ${
                    selectedCategory === cat.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{cat.name}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">{cat.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cat.status === "AVAILABLE" ? "default" : "secondary"}>
                      {cat.status ?? "—"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {cat.items?.length ?? 0} itens
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* UPLOAD IMAGEM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload de imagem</CardTitle>
          <CardDescription>POST /merchants/{`{merchantId}`}/image/upload</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadImage(f);
              }}
              disabled={uploading}
            />
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          {uploadedPath && (
            <div className="flex items-center gap-2 text-xs">
              <ImageIcon className="w-3 h-3" />
              <span className="font-mono truncate flex-1">{uploadedPath}</span>
              <Button size="icon" variant="ghost" onClick={() => copy(uploadedPath)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRIAR / EDITAR ITEM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Criar / editar item</CardTitle>
          <CardDescription>PUT /merchants/{`{merchantId}`}/items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Item ID (deixe vazio para criar)</Label>
              <Input value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="opcional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria selecionada</Label>
              <Input value={selectedCategory} readOnly className="font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Path da imagem</Label>
              <Input
                value={itemImagePath}
                onChange={(e) => setItemImagePath(e.target.value)}
                placeholder="ex: 201808/abc.jpg"
              />
            </div>
          </div>
          <Button onClick={handleUpsertItem} disabled={savingItem}>
            {savingItem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar item
          </Button>
        </CardContent>
      </Card>

      {/* PATCH ITEM PRICE/STATUS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar preço / status do item</CardTitle>
          <CardDescription>PATCH /items/price · PATCH /items/status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Item ID</Label>
            <Input value={patchItemId} onChange={(e) => setPatchItemId(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Novo preço (R$)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={patchItemPrice}
                  onChange={(e) => setPatchItemPrice(e.target.value)}
                />
                <Button onClick={handlePatchItemPrice} variant="outline">
                  <DollarSign className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <div className="flex gap-2">
                <Select value={patchItemStatus} onValueChange={(v: any) => setPatchItemStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Disponível</SelectItem>
                    <SelectItem value="UNAVAILABLE">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handlePatchItemStatus} variant="outline">
                  <Power className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PATCH OPTION PRICE/STATUS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar preço / status de complemento</CardTitle>
          <CardDescription>PATCH /options/price · PATCH /options/status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Option ID</Label>
            <Input value={optionId} onChange={(e) => setOptionId(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Novo preço (R$)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={optionPrice}
                  onChange={(e) => setOptionPrice(e.target.value)}
                />
                <Button onClick={handlePatchOptionPrice} variant="outline">
                  <DollarSign className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <div className="flex gap-2">
                <Select value={optionStatus} onValueChange={(v: any) => setOptionStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Disponível</SelectItem>
                    <SelectItem value="UNAVAILABLE">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handlePatchOptionStatus} variant="outline">
                  <Power className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
