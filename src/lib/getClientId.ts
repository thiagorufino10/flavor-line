import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém o client_id do usuário autenticado a partir do perfil.
 * Lança erro caso não esteja autenticado ou não tenha cliente vinculado.
 */
export async function getClientId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.client_id) throw new Error("Usuário sem cliente vinculado");
  return profile.client_id;
}
