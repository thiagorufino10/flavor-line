import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Settings, ShoppingCart, ChefHat, Tv, LogOut, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { userRole, signOut } = useAuth();
  const [systemName, setSystemName] = useState("FoodFlow");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    const savedLogo = localStorage.getItem("systemLogo");
    
    if (savedName) setSystemName(savedName);
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const allModules = [
    {
      icon: Settings,
      title: "Administração",
      description: "Configurações e cadastros do sistema",
      path: "/admin",
      color: "bg-primary",
      demo: "Admin",
      roles: ["admin"]
    },
    {
      icon: ShoppingCart,
      title: "Lançamento de Pedidos",
      description: "Tela de atendimento e vendas",
      path: "/orders",
      color: "bg-warning",
      demo: "Atendente",
      roles: ["admin", "atendente"]
    },
    {
      icon: ChefHat,
      title: "Cozinha (KDS)",
      description: "Visualização de pedidos para produção",
      path: "/kitchen",
      color: "bg-accent",
      demo: "Cozinha",
      roles: ["admin", "cozinha"]
    },
    {
      icon: UtensilsCrossed,
      title: "Cardápio",
      description: "Gerenciar itens do cardápio",
      path: "/admin/menu",
      color: "bg-accent",
      demo: "Gestão",
      roles: ["admin", "atendente"]
    },
    {
      icon: Package,
      title: "Complementos",
      description: "Gerenciar complementos dos produtos",
      path: "/admin/complements",
      color: "bg-secondary",
      demo: "Gestão",
      roles: ["admin", "atendente"]
    },
    {
      icon: Tv,
      title: "Display do Cliente",
      description: "Chamada de pedidos prontos",
      path: "/customer-display",
      color: "bg-destructive",
      demo: "Acesso público",
      roles: ["admin", "atendente", "cozinha"]
    }
  ];

  // Filtrar módulos baseado no role do usuário
  const modules = allModules.filter(module => 
    userRole && module.roles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                  <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{systemName}</h1>
                <p className="text-sm text-muted-foreground">Sistema de Pedidos v1.0</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Bem-vindo ao Sistema de Pedidos</CardTitle>
              <CardDescription className="text-base">
                Selecione o módulo que deseja acessar
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => (
              <Card 
                key={module.title}
                className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                onClick={() => navigate(module.path)}
              >
                <CardHeader>
                  <div className={`w-14 h-14 ${module.color} rounded-2xl flex items-center justify-center mb-4`}>
                    <module.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-base">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{module.demo}</span>
                    <Button>Acessar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
