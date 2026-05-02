import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conta pedidos delivery com status "novo" (ainda não aceitos).
 * Zera automaticamente quando o usuário entra na rota /delivery-orders.
 */
export function useNewDeliveryCount() {
  const [count, setCount] = useState(0);
  const { pathname } = useLocation();

  const load = async () => {
    const { count: c } = await supabase
      .from("delivery_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "novo");
    setCount(c ?? 0);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("sidebar-delivery-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_orders" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Quando entra na tela de delivery, zera visualmente (status mudará para preparando logo após aceitar)
  useEffect(() => {
    if (pathname === "/delivery-orders") {
      load();
    }
  }, [pathname]);

  return pathname === "/delivery-orders" ? 0 : count;
}
