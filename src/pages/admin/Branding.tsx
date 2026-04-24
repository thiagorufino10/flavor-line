import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Image, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

const Branding = () => {
  const navigate = useNavigate();
  const [systemName, setSystemName] = useState("TARMFood");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    const savedLogo = localStorage.getItem("systemLogo");
    
    if (savedName) setSystemName(savedName);
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione um arquivo de imagem");
        return;
      }
      
      // Validar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 2MB");
        return;
      }
      
      setSelectedFile(file);
      
      // Preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecione uma imagem primeiro");
      return;
    }

    setUploading(true);

    try {
      // Criar nome único para o arquivo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('system-logos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('system-logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error(error.message || "Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (logoUrl && logoUrl.includes('system-logos')) {
      try {
        // Extrair o nome do arquivo da URL
        const fileName = logoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('system-logos')
            .remove([fileName]);
        }
      } catch (error) {
        console.error("Erro ao remover logo:", error);
      }
    }
    
    setLogoUrl("");
    setSelectedFile(null);
    localStorage.removeItem("systemLogo");
    toast.success("Logo removida");
  };

  const handleSave = async () => {
    // Se há arquivo selecionado mas não foi feito upload
    if (selectedFile && !logoUrl.includes('system-logos')) {
      await handleUpload();
    }
    
    localStorage.setItem("systemName", systemName);
    if (logoUrl) {
      localStorage.setItem("systemLogo", logoUrl);
    }
    toast.success("Configurações de marca salvas com sucesso!");
  };

  const handleReset = async () => {
    if (logoUrl && logoUrl.includes('system-logos')) {
      try {
        const fileName = logoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('system-logos')
            .remove([fileName]);
        }
      } catch (error) {
        console.error("Erro ao remover logo:", error);
      }
    }
    
    setSystemName("TARMFood");
    setLogoUrl("");
    setSelectedFile(null);
    localStorage.removeItem("systemName");
    localStorage.removeItem("systemLogo");
    toast.success("Configurações resetadas para o padrão");
  };

  return (
    <AppLayout title="Marca e Identidade" subtitle="Configure a identidade visual do sistema">
<main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Visualização
              </CardTitle>
              <CardDescription>
                Veja como a identidade visual aparecerá no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-primary/5 rounded-lg p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo do sistema" 
                    className="max-h-24 max-w-[200px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      toast.error("Erro ao carregar logo. Verifique a URL.");
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Image className="w-10 h-10 text-primary" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-foreground">{systemName}</h2>
              </div>
            </CardContent>
          </Card>

          {/* System Name Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Nome do Sistema
              </CardTitle>
              <CardDescription>
                Defina o nome que aparecerá em todo o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemName">Nome</Label>
                <Input
                  id="systemName"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="Ex: TARMFood, Lanchonete do João, etc."
                />
                <p className="text-sm text-muted-foreground">
                  Este nome aparecerá nos cabeçalhos e títulos do sistema
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Logo Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Logo do Sistema
              </CardTitle>
              <CardDescription>
                Faça upload da imagem que será usada como logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoFile">Arquivo da Logo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logoFile"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {logoUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecione uma imagem (PNG, JPG, SVG ou WEBP - máximo 2MB)
                </p>
              </div>

              {selectedFile && !logoUrl.includes('system-logos') && (
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Enviando..." : "Fazer Upload"}
                </Button>
              )}

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Dicas para melhor resultado:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Use imagens com fundo transparente (PNG)</li>
                  <li>Tamanho recomendado: 200x200 pixels ou maior</li>
                  <li>Formato recomendado: PNG ou SVG</li>
                  <li>A imagem será redimensionada automaticamente</li>
                  <li>Tamanho máximo: 2MB</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1" disabled={uploading}>
              Salvar Configurações
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={uploading}>
              Restaurar Padrão
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default Branding;
