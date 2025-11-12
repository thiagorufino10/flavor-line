import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Criar usuário admin padrão se não existir
    const users = localStorage.getItem("users");
    if (!users) {
      const defaultUsers = [
        { 
          id: "1", 
          username: "admin", 
          password: "admin",
          name: "Administrador", 
          role: "admin" 
        }
      ];
      localStorage.setItem("users", JSON.stringify(defaultUsers));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.username === username && u.password === password);
    
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      toast.success("Login realizado com sucesso!");
      
      // Redirect based on role
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "atendente") {
        navigate("/orders");
      } else if (user.role === "cozinha") {
        navigate("/kitchen");
      }
    } else {
      toast.error("Usuário ou senha inválidos");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Pastel Favorite</CardTitle>
            <CardDescription className="text-base mt-2">
              Sistema de Pedidos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold">
              Entrar
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center mb-2">Usuário Padrão:</p>
            <div className="space-y-1 text-xs text-muted-foreground text-center">
              <p>👤 <strong>admin</strong> / admin</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
