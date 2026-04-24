import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Quando true, remove o padding interno do main (útil para telas full-bleed como Kitchen). */
  noPadding?: boolean;
}

export function AppLayout({ title, subtitle, actions, children, noPadding }: AppLayoutProps) {
  const [systemName, setSystemName] = useState("TARMFood");

  useEffect(() => {
    const n = localStorage.getItem("systemName");
    if (n) setSystemName(n);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-card px-4 sticky top-0 z-20">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-base font-semibold text-foreground truncate leading-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {subtitle}
                </p>
              )}
              {!title && !subtitle && (
                <span className="text-sm text-muted-foreground">{systemName}</span>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>

          <main className={`flex-1 ${noPadding ? "" : "px-4 md:px-6 py-6"}`}>
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
