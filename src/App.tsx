import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute, SuperAdminRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Orders from "./pages/Orders";
import Kitchen from "./pages/Kitchen";
import CustomerDisplay from "./pages/CustomerDisplay";
import NotFound from "./pages/NotFound";
import SuperAdminLogin from "./pages/SuperAdminLogin";

// Lazy load admin pages (heavy deps like xlsx)
// Admin index page removed — items moved into sidebar groups
const TablesPage = lazy(() => import("./pages/Tables"));
const TableSession = lazy(() => import("./pages/TableSession"));
const TablesAdmin = lazy(() => import("./pages/admin/Tables"));
const Complements = lazy(() => import("./pages/admin/Complements"));
const CashFlow = lazy(() => import("./pages/admin/CashFlow"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const PaymentRates = lazy(() => import("./pages/admin/PaymentRates"));
const Users = lazy(() => import("./pages/admin/Users"));
const Menu = lazy(() => import("./pages/admin/Menu"));
const Printer = lazy(() => import("./pages/admin/Printer"));
const OperationMode = lazy(() => import("./pages/admin/OperationMode"));
const Branding = lazy(() => import("./pages/admin/Branding"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Super-admin TARM */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />

        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

        {/* Admin routes - apenas admin */}
        <Route path="/admin" element={<ProtectedRoute requiredRole={["admin"]}><Admin /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requiredRole={["admin"]}><Users /></ProtectedRoute>} />
        <Route path="/admin/payment-rates" element={<ProtectedRoute requiredRole={["admin"]}><PaymentRates /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute requiredRole={["admin", "atendente"]}><Menu /></ProtectedRoute>} />
        <Route path="/admin/complements" element={<ProtectedRoute requiredRole={["admin", "atendente"]}><Complements /></ProtectedRoute>} />
        <Route path="/admin/printer" element={<ProtectedRoute requiredRole={["admin"]}><Printer /></ProtectedRoute>} />
        <Route path="/admin/operation-mode" element={<ProtectedRoute requiredRole={["admin"]}><OperationMode /></ProtectedRoute>} />
        <Route path="/admin/branding" element={<ProtectedRoute requiredRole={["admin"]}><Branding /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute requiredRole={["admin"]}><Categories /></ProtectedRoute>} />
        <Route path="/admin/cash-flow" element={<ProtectedRoute requiredRole={["admin"]}><CashFlow /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute requiredRole={["admin"]}><Reports /></ProtectedRoute>} />
        <Route path="/admin/tables" element={<ProtectedRoute requiredRole={["admin"]}><TablesAdmin /></ProtectedRoute>} />

        {/* Attendant routes */}
        <Route path="/orders" element={<ProtectedRoute requiredRole={["admin", "atendente"]}><Orders /></ProtectedRoute>} />
        <Route path="/tables" element={<ProtectedRoute requiredRole={["admin", "atendente"]}><TablesPage /></ProtectedRoute>} />
        <Route path="/tables/:sessionId" element={<ProtectedRoute requiredRole={["admin", "atendente"]}><TableSession /></ProtectedRoute>} />

        {/* Kitchen routes */}
        <Route path="/kitchen" element={<ProtectedRoute requiredRole={["admin", "cozinha"]}><Kitchen /></ProtectedRoute>} />

        {/* Public routes */}
        <Route path="/customer-display" element={<CustomerDisplay />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </TooltipProvider>
);

export default App;

