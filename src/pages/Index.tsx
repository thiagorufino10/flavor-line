import { useNavigate } from "react-router-dom";
import {
  UtensilsCrossed,
  Settings,
  ShoppingCart,
  ChefHat,
  Tv,
  Package,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();
  const { userRole, userName } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  type Module = {
    icon: typeof Settings;
    title: string;
    description: string;
    path: string;
    roles: string[];
    color: string;
  };

  const allModules: Module[] = [
    {
      icon: LayoutGrid,
      title: "Mesas",
      description: "Atendimento no salão",
      path: "/tables",
      roles: ["admin", "atendente"],
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: ShoppingCart,
      title: "Pedido Avulso",
      description: "Balcão e viagem",
      path: "/orders",
      roles: ["admin", "atendente"],
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: ChefHat,
      title: "Cozinha",
      description: "Pedidos em produção",
      path: "/kitchen",
      roles: ["admin", "cozinha"],
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: Tv,
      title: "Display",
      description: "Painel do cliente",
      path: "/customer-display",
      roles: ["admin", "atendente", "cozinha"],
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: UtensilsCrossed,
      title: "Cardápio",
      description: "Pratos e preços",
      path: "/admin/menu",
      roles: ["admin", "atendente"],
      color: "bg-rose-50 text-rose-600",
    },
    {
      icon: Package,
      title: "Complementos",
      description: "Adicionais",
      path: "/admin/complements",
      roles: ["admin", "atendente"],
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: Settings,
      title: "Administração",
      description: "Relatórios e ajustes",
      path: "/admin",
      roles: ["admin"],
      color: "bg-slate-100 text-slate-700",
    },
  ];

  const modules = allModules.filter((m) => userRole && m.roles.includes(userRole));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            {greeting},{" "}
            <span className="text-primary">
              {userName?.split(" ")[0] || "bem-vindo"}
            </span>{" "}
            👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {timeStr} · O que vamos fazer agora?
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((m) => (
            <Card
              key={m.title}
              onClick={() => navigate(m.path)}
              className="cursor-pointer p-5 hover:shadow-md hover:-translate-y-0.5 transition-all border-border/60"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${m.color}`}
              >
                <m.icon className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-foreground text-sm">{m.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
