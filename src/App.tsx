import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Index />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/payment-rates" element={<PaymentRates />} />
      <Route path="/admin/menu" element={<Menu />} />
      <Route path="/admin/complements" element={<Complements />} />
      <Route path="/admin/printer" element={<Printer />} />
      <Route path="/admin/operation-mode" element={<OperationMode />} />
      <Route path="/admin/cash-flow" element={<CashFlow />} />
      <Route path="/admin/reports" element={<Reports />} />
      
      {/* Attendant routes */}
      <Route path="/orders" element={<Orders />} />
      
      {/* Kitchen routes */}
      <Route path="/kitchen" element={<Kitchen />} />
      
      {/* Public routes */}
      <Route path="/customer-display" element={<CustomerDisplay />} />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
