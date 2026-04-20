import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SuperAdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signInSuperAdmin, user, userRole } = useAuth();

  // Garante que o super-admin TARM exista no primeiro acesso
  useEffect(() => {
    supabase.functions.invoke("super-admin-bootstrap").catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    if (user && userRole === "super_admin") navigate("/super-admin");
  }, [user, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signInSuperAdmin(username, password);
      if (error) {
        toast.error(error.message || "Usuário ou senha inválidos");
        return;
      }
      toast.success("Acesso liberado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/15 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/30">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">TARM Solution</CardTitle>
          <CardDescription>Painel Super-Admin · Gerência de Clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="su-user">Usuário</Label>
              <Input
                id="su-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-pass">Senha</Label>
              <Input
                id="su-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Voltar para login do sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminLogin;
