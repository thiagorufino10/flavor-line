import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Image, Type } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Branding = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [systemName, setSystemName] = useState("Pastel Favorite");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    const savedLogo = localStorage.getItem("systemLogo");
    
    if (savedName) setSystemName(savedName);
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  const handleSave = () => {
    localStorage.setItem("systemName", systemName);
    localStorage.setItem("systemLogo", logoUrl);
    toast.success("Configurações de marca salvas com sucesso!");
  };

  const handleReset = () => {
    setSystemName("Pastel Favorite");
    setLogoUrl("");
    localStorage.removeItem("systemName");
    localStorage.removeItem("systemLogo");
    toast.success("Configurações resetadas para o padrão");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Marca e Identidade</h1>
              <p className="text-sm text-muted-foreground">Configure a identidade visual do sistema</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              signOut();
              navigate("/login");
            }}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

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
                  placeholder="Ex: Pastel Favorite"
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
                Adicione a URL da imagem que será usada como logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL da Logo</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  type="url"
                />
                <p className="text-sm text-muted-foreground">
                  Cole a URL completa de uma imagem hospedada online (PNG, JPG ou SVG)
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Dicas para melhor resultado:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Use imagens com fundo transparente (PNG)</li>
                  <li>Tamanho recomendado: 200x200 pixels</li>
                  <li>Formato recomendado: PNG ou SVG</li>
                  <li>A imagem será redimensionada automaticamente</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1">
              Salvar Configurações
            </Button>
            <Button onClick={handleReset} variant="outline">
              Restaurar Padrão
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Branding;
