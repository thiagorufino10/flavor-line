import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Retorna true se o cliente atual tem a integração iFood habilitada.
 * Demais clientes não veem nada relacionado ao iFood.
 */
export function useIfoodEnabled() {
  const { clientId } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("ifood_enabled")
        .eq("id", clientId)
        .maybeSingle();
      if (mounted) {
        setEnabled(Boolean((data as any)?.ifood_enabled));
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clientId]);

  return { enabled, loading };
}
