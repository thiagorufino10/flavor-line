import {
  LayoutGrid,
  ShoppingCart,
  ChefHat,
  Tv,
  UtensilsCrossed,
  Package,
  Settings,
  Home,
  LogOut,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type Item = {
  title: string;
  url: string;
  icon: typeof Home;
  roles: string[];
};

const operacao: Item[] = [
  { title: "Início", url: "/", icon: Home, roles: ["admin", "atendente", "cozinha"] },
  { title: "Mesas", url: "/tables", icon: LayoutGrid, roles: ["admin", "atendente"] },
  { title: "Pedido Avulso", url: "/orders", icon: ShoppingCart, roles: ["admin", "atendente"] },
  { title: "Cozinha", url: "/kitchen", icon: ChefHat, roles: ["admin", "cozinha"] },
  { title: "Display", url: "/customer-display", icon: Tv, roles: ["admin", "atendente", "cozinha"] },
];

const gestao: Item[] = [
  { title: "Cardápio", url: "/admin/menu", icon: UtensilsCrossed, roles: ["admin", "atendente"] },
  { title: "Complementos", url: "/admin/complements", icon: Package, roles: ["admin", "atendente"] },
  { title: "Financeiro", url: "/admin/cash-flow", icon: DollarSign, roles: ["admin"] },
  { title: "Relatórios", url: "/admin/reports", icon: TrendingUp, roles: ["admin"] },
  { title: "Administração", url: "/admin", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { userRole, signOut } = useAuth();
  const [systemName, setSystemName] = useState("TARMFood");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const n = localStorage.getItem("systemName");
    const l = localStorage.getItem("systemLogo");
    if (n) setSystemName(n);
    if (l) setLogoUrl(l);
  }, []);

  const filter = (items: Item[]) => items.filter((i) => userRole && i.roles.includes(userRole));

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItems = (items: Item[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild tooltip={item.title}>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 rounded-md hover:bg-muted/60"
            activeClassName="bg-muted text-primary font-medium"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          {logoUrl ? (
            <img src={logoUrl} alt={systemName} className="h-8 w-8 rounded-md object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
            </div>
          )}
          {!collapsed && (
            <span className="font-semibold text-sm truncate">{systemName}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(filter(operacao))}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filter(gestao).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(filter(gestao))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
