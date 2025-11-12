import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/payment-rates" element={<PaymentRates />} />
          <Route path="/admin/menu" element={<Menu />} />
          <Route path="/admin/complements" element={<Complements />} />
          <Route path="/admin/printer" element={<Printer />} />
          <Route path="/admin/operation-mode" element={<OperationMode />} />
          <Route path="/admin/cash-flow" element={<CashFlow />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/customer-display" element={<CustomerDisplay />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
