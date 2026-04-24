/**
 * Mapeia URLs de rotas para imports dinâmicos das páginas lazy.
 * Pré-carrega o chunk no hover/focus para que o clique abra instantaneamente.
 */
const loaders: Record<string, () => Promise<unknown>> = {
  "/tables": () => import("@/pages/Tables"),
  "/orders": () => import("@/pages/Orders"),
  "/admin/menu": () => import("@/pages/admin/Menu"),
  "/admin/complements": () => import("@/pages/admin/Complements"),
  "/admin/categories": () => import("@/pages/admin/Categories"),
  "/admin/cash-flow": () => import("@/pages/admin/CashFlow"),
  "/admin/reports": () => import("@/pages/admin/Reports"),
  "/admin/users": () => import("@/pages/admin/Users"),
  "/admin/payment-rates": () => import("@/pages/admin/PaymentRates"),
  "/admin/tables": () => import("@/pages/admin/Tables"),
  "/admin/printer": () => import("@/pages/admin/Printer"),
  "/admin/operation-mode": () => import("@/pages/admin/OperationMode"),
  "/admin/branding": () => import("@/pages/admin/Branding"),
};

const triggered = new Set<string>();

export const prefetchRoute = (path: string) => {
  if (triggered.has(path)) return;
  const loader = loaders[path];
  if (!loader) return;
  triggered.add(path);
  // Não bloqueia o thread principal
  loader().catch(() => triggered.delete(path));
};

/**
 * Pré-carrega todas as rotas em idle (após login/inicialização)
 * para que qualquer clique seja instantâneo.
 */
export const prefetchAllRoutes = () => {
  const ric =
    (window as any).requestIdleCallback ||
    ((cb: () => void) => setTimeout(cb, 1));
  ric(() => {
    Object.keys(loaders).forEach(prefetchRoute);
  });
};
