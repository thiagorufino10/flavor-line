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
  Users,
  CreditCard,
  Printer,
  Monitor,
  Palette,
  MessageCircle,
  Bike,
  Plug,
  Store,
} from "lucide-react";
import { useIfoodEnabled } from "@/hooks/useIfoodEnabled";
import { useNewDeliveryCount } from "@/hooks/useNewDeliveryCount";
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
import tarmfoodLogo from "@/assets/tarmfood-logo.png";

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
  { title: "Delivery", url: "/delivery-orders", icon: Bike, roles: ["admin", "atendente", "cozinha"] },
  { title: "Cozinha", url: "/kitchen", icon: ChefHat, roles: ["admin", "cozinha"] },
];

const gestao: Item[] = [
  { title: "Cardápio", url: "/admin/menu", icon: UtensilsCrossed, roles: ["admin", "atendente"] },
  { title: "Cardápio Delivery", url: "/admin/delivery-menu", icon: Bike, roles: ["admin"] },
  { title: "Complementos", url: "/admin/complements", icon: Package, roles: ["admin", "atendente"] },
  { title: "Categorias", url: "/admin/categories", icon: LayoutGrid, roles: ["admin"] },
  { title: "Financeiro", url: "/admin/cash-flow", icon: DollarSign, roles: ["admin"] },
  { title: "Relatórios", url: "/admin/reports", icon: TrendingUp, roles: ["admin"] },
];

const configuracoes: Item[] = [
  { title: "Usuários e Perfis", url: "/admin/users", icon: Users, roles: ["admin"] },
  { title: "Taxas de Pagamento", url: "/admin/payment-rates", icon: CreditCard, roles: ["admin"] },
  { title: "Cadastro de Mesas", url: "/admin/tables", icon: LayoutGrid, roles: ["admin"] },
  { title: "Impressora", url: "/admin/printer", icon: Printer, roles: ["admin"] },
  { title: "Modo de Operação", url: "/admin/operation-mode", icon: Monitor, roles: ["admin"] },
  { title: "Marca e Identidade", url: "/admin/branding", icon: Palette, roles: ["admin"] },
  { title: "WhatsApp / Loja Online", url: "/admin/whatsapp", icon: MessageCircle, roles: ["admin"] },
  { title: "Delivery / Bairros", url: "/admin/delivery", icon: Bike, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { userRole, signOut } = useAuth();
  const { enabled: ifoodEnabled } = useIfoodEnabled();
  const newDeliveryCount = useNewDeliveryCount();
  const [systemName, setSystemName] = useState("TARMFood");
  const [logoUrl, setLogoUrl] = useState("");

  // Itens iFood — só aparecem se a flag ifood_enabled estiver ligada para o cliente
  const ifoodOperacao: Item[] = ifoodEnabled
    ? [{ title: "Pedidos iFood", url: "/orders/ifood", icon: Plug, roles: ["admin", "atendente"] }]
    : [];
  const ifoodGestao: Item[] = [];
  const ifoodConfig: Item[] = [];
  const ifoodConfiguracoes: Item[] = ifoodEnabled
    ? [
        { title: "Integração iFood", url: "/admin/ifood", icon: Plug, roles: ["admin"] },
        { title: "Loja iFood", url: "/admin/loja-ifood", icon: Store, roles: ["admin"] },
      ]
    : [];

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
    items.map((item) => {
      const isDelivery = item.url === "/delivery-orders";
      const showBadge = isDelivery && newDeliveryCount > 0;
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild tooltip={item.title}>
            <NavLink
              to={item.url}
              end
              className={`flex items-center gap-3 rounded-md hover:bg-muted/60 ${
                showBadge ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 animate-pulse" : ""
              }`}
              activeClassName="bg-muted text-primary font-medium"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="flex-1">{item.title}</span>}
              {showBadge && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-orange-500 text-white">
                  {newDeliveryCount}
                </span>
              )}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <img
            src={logoUrl || tarmfoodLogo}
            alt={systemName}
            className="h-8 w-8 rounded-md object-contain"
          />
          {!collapsed && (
            <span className="font-semibold text-sm truncate">{systemName}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(filter([...operacao, ...ifoodOperacao]))}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filter([...gestao, ...ifoodGestao]).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(filter([...gestao, ...ifoodGestao]))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filter([...configuracoes, ...ifoodConfig]).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Configurações</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(filter([...configuracoes, ...ifoodConfig]))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filter(ifoodConfiguracoes).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Configurações iFood</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(filter(ifoodConfiguracoes))}</SidebarMenu>
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
