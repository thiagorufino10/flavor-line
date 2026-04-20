import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userName: string | null;
  clientId: string | null;
  clientName: string | null;
  loading: boolean;
  signIn: (clientName: string, username: string, password: string) => Promise<{ error: any }>;
  signInSuperAdmin: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setUserRole(null);
          setUserName(null);
          setClientId(null);
          setClientName(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, client_id, clients(name)")
        .eq("id", userId)
        .maybeSingle();

      setUserName(profile?.full_name ?? null);
      setClientId(profile?.client_id ?? null);
      const clientsRel = (profile as any)?.clients;
      setClientName(clientsRel?.name ?? null);

      // Pega o role mais "alto" do usuário neste cliente (ou super_admin global)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, client_id")
        .eq("user_id", userId);

      let resolved: string | null = null;
      if (roles?.some(r => r.role === "super_admin")) resolved = "super_admin";
      else if (roles?.some(r => r.role === "admin")) resolved = "admin";
      else if (roles?.some(r => r.role === "atendente")) resolved = "atendente";
      else if (roles?.some(r => r.role === "cozinha")) resolved = "cozinha";

      setUserRole(resolved);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Login normal: Cliente + Usuário + Senha
  const signIn = async (clientName: string, username: string, password: string) => {
    if (!clientName.trim() || !username.trim()) {
      return { error: { message: "Cliente e usuário são obrigatórios" } };
    }
    const { data, error: rpcError } = await supabase.rpc("resolve_client_login", {
      _client_name: clientName.trim(),
      _username: username.trim(),
    });
    if (rpcError) return { error: rpcError };
    const row = (data as any[])?.[0];
    if (!row?.email) return { error: { message: "Cliente, usuário ou senha inválidos" } };
    if (row.client_active === false) return { error: { message: "Cliente desativado. Contate o suporte." } };

    const { error } = await supabase.auth.signInWithPassword({ email: row.email, password });
    return { error };
  };

  // Login super-admin TARM: usuário + senha (sem cliente)
  const signInSuperAdmin = async (username: string, password: string) => {
    const { data, error: rpcError } = await supabase.rpc("resolve_super_admin_login", {
      _username: username.trim(),
    });
    if (rpcError) return { error: rpcError };
    const row = (data as any[])?.[0];
    if (!row?.email) return { error: { message: "Usuário ou senha inválidos" } };
    const { error } = await supabase.auth.signInWithPassword({ email: row.email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserName(null);
    setClientId(null);
    setClientName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        userName,
        clientId,
        clientName,
        loading,
        signIn,
        signInSuperAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
