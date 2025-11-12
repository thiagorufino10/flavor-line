import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Orders from "./pages/Orders";
import Kitchen from "./pages/Kitchen";
import CustomerDisplay from "./pages/CustomerDisplay";
import Complements from "./pages/admin/Complements";
import CashFlow from "./pages/admin/CashFlow";
import Reports from "./pages/admin/Reports";
import PaymentRates from "./pages/admin/PaymentRates";
import Users from "./pages/admin/Users";
import Menu from "./pages/admin/Menu";
import Printer from "./pages/admin/Printer";
import OperationMode from "./pages/admin/OperationMode";
import Branding from "./pages/admin/Branding";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      
      {/* Admin routes - apenas admin */}
      <Route path="/admin" element={<ProtectedRoute requiredRole={["admin"]}><Admin /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requiredRole={["admin"]}><Users /></ProtectedRoute>} />
      <Route path="/admin/payment-rates" element={<ProtectedRoute requiredRole={["admin"]}><PaymentRates /></ProtectedRoute>} />
      <Route path="/admin/menu" element={<ProtectedRoute requiredRole={["admin"]}><Menu /></ProtectedRoute>} />
      <Route path="/admin/complements" element={<ProtectedRoute requiredRole={["admin"]}><Complements /></ProtectedRoute>} />
      <Route path="/admin/printer" element={<ProtectedRoute requiredRole={["admin"]}><Printer /></ProtectedRoute>} />
      <Route path="/admin/operation-mode" element={<ProtectedRoute requiredRole={["admin"]}><OperationMode /></ProtectedRoute>} />
      <Route path="/admin/branding" element={<ProtectedRoute requiredRole={["admin"]}><Branding /></ProtectedRoute>} />
      <Route path="/admin/cash-flow" element={<ProtectedRoute requiredRole={["admin"]}><CashFlow /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute requiredRole={["admin"]}><Reports /></ProtectedRoute>} />
      
      {/* Attendant routes - apenas atendente e admin */}
      <Route path="/orders" element={<ProtectedRoute requiredRole={["admin", "atendente"]}><Orders /></ProtectedRoute>} />
      
      {/* Kitchen routes - apenas cozinha e admin */}
      <Route path="/kitchen" element={<ProtectedRoute requiredRole={["admin", "cozinha"]}><Kitchen /></ProtectedRoute>} />
      
      {/* Public routes */}
      <Route path="/customer-display" element={<CustomerDisplay />} />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
