import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cria (ou garante a existência) do super-admin TARM
// Login: Usuário "tarm" / Senha "1793155"
// Email técnico interno: tarm@tarmsolution.system
const SUPER_ADMIN_EMAIL = "tarm@tarmsolution.system";
const SUPER_ADMIN_USERNAME = "tarm";
const SUPER_ADMIN_PASSWORD = "1793155";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Procura o usuário pelo email
    const { data: list } = await supabase.auth.admin.listUsers();
    let user = list?.users?.find(u => u.email === SUPER_ADMIN_EMAIL);

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "TARM Solution - Super Admin" },
      });
      if (error) throw error;
      user = data.user!;
    } else {
      // Garante a senha (idempotente)
      await supabase.auth.admin.updateUserById(user.id, { password: SUPER_ADMIN_PASSWORD });
    }

    // Garante o profile (sem client_id)
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: "TARM Solution - Super Admin",
      username: SUPER_ADMIN_USERNAME,
      client_id: null,
    });

    // Garante o role super_admin
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!existingRole) {
      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "super_admin",
        client_id: null,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Super-admin TARM pronto", user_id: user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("super-admin-bootstrap error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
