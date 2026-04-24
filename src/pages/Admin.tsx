import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import {
  Users,
  CreditCard,
  UtensilsCrossed,
  Package,
  Printer,
  DollarSign,
  TrendingUp,
  Monitor,
  Palette,
  LayoutGrid,
} from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();

  const adminSections = [
    { icon: Users, title: "Usuários e Perfis", description: "Gerenciar usuários do sistema", color: "bg-blue-50 text-blue-600", path: "/admin/users" },
    { icon: CreditCard, title: "Taxas de Pagamento", description: "Configurar taxas de crédito e débito", color: "bg-amber-50 text-amber-600", path: "/admin/payment-rates" },
    { icon: LayoutGrid, title: "Categorias", description: "Cadastre categorias e a IA cria a imagem", color: "bg-cyan-50 text-cyan-600", path: "/admin/categories" },
    { icon: LayoutGrid, title: "Mesas", description: "Cadastre as mesas do estabelecimento", color: "bg-emerald-50 text-emerald-600", path: "/admin/tables" },
    { icon: UtensilsCrossed, title: "Cardápio", description: "Gerenciar itens do cardápio", color: "bg-rose-50 text-rose-600", path: "/admin/menu" },
    { icon: Package, title: "Complementos", description: "Gerenciar complementos e adicionais", color: "bg-orange-50 text-orange-600", path: "/admin/complements" },
    { icon: Printer, title: "Impressora", description: "Configurar impressora de pedidos", color: "bg-slate-100 text-slate-700", path: "/admin/printer" },
    { icon: Monitor, title: "Modo de Operação", description: "Impressão ou Display Digital", color: "bg-indigo-50 text-indigo-600", path: "/admin/operation-mode" },
    { icon: Palette, title: "Marca e Identidade", description: "Logo e nome do sistema", color: "bg-pink-50 text-pink-600", path: "/admin/branding" },
  ];

  const financialSections = [
    { icon: DollarSign, title: "Fluxo de Caixa", description: "Controle de entradas e saídas", color: "bg-emerald-50 text-emerald-600", path: "/admin/cash-flow" },
    { icon: TrendingUp, title: "Relatórios", description: "Análises e insights do negócio", color: "bg-blue-50 text-blue-600", path: "/admin/reports" },
  ];

  const renderCards = (items: typeof adminSections) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((s) => (
        <Card
          key={s.title}
          className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-border/60"
          onClick={() => navigate(s.path)}
        >
          <CardHeader>
            <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">{s.title}</CardTitle>
            <CardDescription className="text-xs">{s.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="secondary" size="sm" className="w-full">Acessar</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AppLayout title="Painel Administrativo" subtitle="Configurações e relatórios do sistema">
      <div className="max-w-6xl mx-auto space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Configurações do Sistema
          </h2>
          {renderCards(adminSections)}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Financeiro e Relatórios
          </h2>
          {renderCards(financialSections)}
        </section>
      </div>
    </AppLayout>
  );
};

export default Admin;
