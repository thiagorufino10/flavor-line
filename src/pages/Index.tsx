import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  UtensilsCrossed,
  Settings,
  ShoppingCart,
  ChefHat,
  Tv,
  LogOut,
  Package,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { userRole, userName, signOut } = useAuth();
  const [systemName, setSystemName] = useState("TARMFood");
  const [logoUrl, setLogoUrl] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    const savedLogo = localStorage.getItem("systemLogo");
    if (savedName) setSystemName(savedName);
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  type Module = {
    icon: typeof Settings;
    title: string;
    description: string;
    path: string;
    badge?: string;
    roles: string[];
    primary?: boolean;
  };

  const allModules: Module[] = [
    {
      icon: LayoutGrid,
      title: "Atendimento por Mesa",
      description: "Abrir mesas, lançar pedidos e receber pagamentos parciais",
      path: "/tables",
      badge: "Salão",
      roles: ["admin", "atendente"],
      primary: true,
    },
    {
      icon: ShoppingCart,
      title: "Pedido Avulso",
      description: "Atendimento rápido para balcão e viagem",
      path: "/orders",
      badge: "Balcão",
      roles: ["admin", "atendente"],
      primary: true,
    },
    {
      icon: ChefHat,
      title: "Cozinha (KDS)",
      description: "Acompanhe a produção em tempo real",
      path: "/kitchen",
      badge: "Operação",
      roles: ["admin", "cozinha"],
    },
    {
      icon: Tv,
      title: "Display do Cliente",
      description: "Painel para chamada de pedidos prontos",
      path: "/customer-display",
      badge: "Painel",
      roles: ["admin", "atendente", "cozinha"],
    },
    {
      icon: UtensilsCrossed,
      title: "Cardápio",
      description: "Gerenciar pratos, preços e disponibilidade",
      path: "/admin/menu",
      badge: "Gestão",
      roles: ["admin", "atendente"],
    },
    {
      icon: Package,
      title: "Complementos",
      description: "Adicionais e variações dos pratos",
      path: "/admin/complements",
      badge: "Gestão",
      roles: ["admin", "atendente"],
    },
    {
      icon: Settings,
      title: "Administração",
      description: "Configurações, relatórios e financeiro",
      path: "/admin",
      badge: "Admin",
      roles: ["admin"],
    },
  ];

  const modules = allModules.filter(
    (m) => userRole && m.roles.includes(userRole)
  );
  const primary = modules.filter((m) => m.primary);
  const secondary = modules.filter((m) => !m.primary);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero / header escuro */}
      <header className="relative bg-ink text-ink-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, hsl(var(--gold)) 0, transparent 40%), radial-gradient(circle at 75% 75%, hsl(var(--gold)) 0, transparent 40%)",
          }}
        />
        <div className="container mx-auto px-6 py-6 relative">
          {/* topo: brand + logout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={systemName}
                  className="h-11 w-11 object-contain rounded-sm"
                />
              ) : (
                <div className="h-11 w-11 border border-gold/40 rounded-sm flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-gold" />
                </div>
              )}
              <div className="leading-tight">
                <p className="font-serif text-xl tracking-wide">{systemName}</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70">
                  Restaurant Management
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-ink-foreground/80 hover:text-ink-foreground hover:bg-white/5 gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>

          {/* saudação + relógio */}
          <div className="mt-10 mb-12 max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-10 bg-gold/60" />
              <span className="text-[11px] uppercase tracking-[0.3em] text-gold/80">
                {dateStr} · {timeStr}
              </span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-medium leading-tight">
              {greeting},{" "}
              <span className="text-gold">{userName?.split(" ")[0] || "bem-vindo"}</span>.
            </h1>
            <p className="mt-3 text-ink-foreground/70 text-base md:text-lg max-w-xl">
              Selecione um módulo para começar o seu turno.
            </p>
          </div>
        </div>
      </header>

      {/* Conteúdo: lista estilo dashboard */}
      <main className="flex-1 container mx-auto px-6 py-10 -mt-6">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Ações primárias */}
          {primary.length > 0 && (
            <section>
              <SectionLabel>Operação</SectionLabel>
              <div className="space-y-3">
                {primary.map((m) => (
                  <ModuleRow
                    key={m.title}
                    {...m}
                    onClick={() => navigate(m.path)}
                    featured
                  />
                ))}
              </div>
            </section>
          )}

          {/* Secundárias */}
          {secondary.length > 0 && (
            <section>
              <SectionLabel>Mais módulos</SectionLabel>
              <div className="space-y-2">
                {secondary.map((m) => (
                  <ModuleRow
                    key={m.title}
                    {...m}
                    onClick={() => navigate(m.path)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-medium">
      {children}
    </span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

interface RowProps {
  icon: typeof Settings;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  featured?: boolean;
}

const ModuleRow = ({
  icon: Icon,
  title,
  description,
  badge,
  onClick,
  featured,
}: RowProps) => {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-5 text-left rounded-md border bg-card transition-smooth hover:border-gold/60 hover:shadow-[var(--shadow-card)] ${
        featured ? "p-5 md:p-6" : "p-4"
      }`}
    >
      <div
        className={`flex-shrink-0 flex items-center justify-center rounded-sm transition-smooth ${
          featured
            ? "h-14 w-14 bg-ink text-gold group-hover:bg-gold group-hover:text-ink"
            : "h-11 w-11 bg-secondary text-foreground group-hover:bg-ink group-hover:text-gold"
        }`}
      >
        <Icon className={featured ? "w-6 h-6" : "w-5 h-5"} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3
            className={`font-serif text-foreground truncate ${
              featured ? "text-2xl" : "text-lg"
            }`}
          >
            {title}
          </h3>
          {badge && (
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
              {badge}
            </span>
          )}
        </div>
        <p
          className={`text-muted-foreground truncate ${
            featured ? "text-sm md:text-base" : "text-sm"
          }`}
        >
          {description}
        </p>
      </div>

      <ChevronRight className="flex-shrink-0 w-5 h-5 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-smooth" />
    </button>
  );
};

export default Index;
