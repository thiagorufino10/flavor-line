import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super-admin não acessa o app dos clientes (ele tem o painel próprio)
  if (userRole === "super_admin") {
    return <Navigate to="/super-admin" replace />;
  }

  if (requiredRole && userRole && !requiredRole.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== "super_admin") {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <>{children}</>;
};
