import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import tarmfoodLogo from "@/assets/tarmfood-logo.png";

const Login = () => {
  const [clientName, setClientName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemName, setSystemName] = useState("TARMFood");
  const [logoUrl, setLogoUrl] = useState("");
  const navigate = useNavigate();
  const { signIn, user, userRole } = useAuth();

  useEffect(() => {
    const savedName = localStorage.getItem("systemName");
    const savedLogo = localStorage.getItem("systemLogo");
    if (savedName) setSystemName(savedName);
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  useEffect(() => {
    if (user && userRole) {
      if (userRole === "super_admin") navigate("/super-admin");
      else if (userRole === "admin") navigate("/");
      else if (userRole === "atendente") navigate("/orders");
      else if (userRole === "cozinha") navigate("/kitchen");
    }
  }, [user, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(clientName, username, password);
      if (error) {
        toast.error(error.message || "Cliente, usuário ou senha inválidos");
        return;
      }
      toast.success("Login realizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center justify-center">
            <img
              src={logoUrl || tarmfoodLogo}
              alt={systemName}
              className="max-h-28 max-w-[220px] object-contain"
            />
          </div>
          <div>
            <CardDescription className="text-base mt-2">Sistema de Gestão de Pedidos</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Input
                id="client"
                type="text"
                placeholder="Nome do estabelecimento"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="h-12"
                disabled={loading}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link
              to="/super-admin/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-3 h-3" />
              Acesso TARM Solution
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
