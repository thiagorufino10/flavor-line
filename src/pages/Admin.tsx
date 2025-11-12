import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LogOut, 
  Users, 
  CreditCard, 
  UtensilsCrossed, 
  Package,
  Printer,
  Settings,
  DollarSign,
  TrendingUp,
  Monitor
} from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const adminSections = [
    {
      icon: Users,
      title: "Usuários e Perfis",
      description: "Gerenciar usuários do sistema",
      color: "bg-primary",
      path: "/admin/users"
    },
    {
      icon: CreditCard,
      title: "Taxas de Pagamento",
      description: "Configurar taxas de crédito e débito",
      color: "bg-warning",
      path: "/admin/payment-rates"
    },
    {
      icon: UtensilsCrossed,
      title: "Cardápio",
      description: "Gerenciar itens do cardápio",
      color: "bg-accent",
      path: "/admin/menu"
    },
    {
      icon: Package,
      title: "Complementos",
      description: "Gerenciar complementos e adicionais",
      color: "bg-destructive",
      path: "/admin/complements"
    },
    {
      icon: Printer,
      title: "Impressora",
      description: "Configurar impressora de pedidos",
      color: "bg-secondary",
      path: "/admin/printer"
    },
    {
      icon: Monitor,
      title: "Modo de Operação",
      description: "Impressão ou Display Digital",
      color: "bg-info",
      path: "/admin/operation-mode"
    }
  ];

  const financialSections = [
    {
      icon: DollarSign,
      title: "Fluxo de Caixa",
      description: "Controle de entradas e saídas",
      color: "bg-success",
      path: "/admin/cash-flow"
    },
    {
      icon: TrendingUp,
      title: "Relatórios",
      description: "Análises e insights do negócio",
      color: "bg-info",
      path: "/admin/reports"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Pastel Favorite</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Configurações do Sistema */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Configurações do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Card 
                key={section.title}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center mb-4`}>
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Financeiro e Relatórios */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Financeiro e Relatórios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {financialSections.map((section) => (
              <Card 
                key={section.title}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center mb-4`}>
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
