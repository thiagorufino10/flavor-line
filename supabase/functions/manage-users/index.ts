import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gestão de usuários DENTRO de um cliente. Admin do cliente cria/edita/exclui usuários.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Não autorizado");
    const accessToken = authHeader.replace("Bearer ", "").trim();

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !user) throw new Error("Não autorizado");

    // Verifica role admin e pega client_id
    const { data: profile } = await admin
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .maybeSingle();
    const clientId = profile?.client_id;
    if (!clientId) throw new Error("Usuário sem cliente vinculado");

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Acesso negado - apenas administradores");

    // Pega slug do cliente para construir e-mail técnico
    const { data: client } = await admin.from("clients").select("slug").eq("id", clientId).maybeSingle();
    const slug = client?.slug ?? "cliente";

    const { action, userData } = await req.json();

    if (action === "list") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, username")
        .eq("client_id", clientId);

      const ids = (profiles ?? []).map(p => p.id);
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role")
        .eq("client_id", clientId)
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      const users = (profiles ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        role: roles?.find(r => r.user_id === p.id)?.role ?? "atendente",
      }));

      return new Response(
        JSON.stringify({ success: true, users }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { username, password, full_name, role } = userData;
      if (!username || !password || !role) throw new Error("Campos obrigatórios: username, password, role");

      const email = `${username.toLowerCase().trim()}@${slug}.tarmfood.local`;

      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || username },
      });
      if (createError) throw createError;
      const newId = newUser.user!.id;

      const { error: profErr } = await admin.from("profiles").upsert({
        id: newId,
        full_name: full_name || username,
        username: username.toLowerCase().trim(),
        client_id: clientId,
      });
      if (profErr) {
        await admin.auth.admin.deleteUser(newId);
        throw profErr;
      }

      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: newId,
        role,
        client_id: clientId,
      });
      if (roleErr) {
        await admin.auth.admin.deleteUser(newId);
        throw roleErr;
      }

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { userId } = userData;
      // Garante que o alvo é do mesmo cliente
      const { data: target } = await admin
        .from("profiles")
        .select("client_id")
        .eq("id", userId)
        .maybeSingle();
      if (target?.client_id !== clientId) throw new Error("Usuário não pertence ao seu cliente");
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("manage-users error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
