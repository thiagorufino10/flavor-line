import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gerência de clientes (multi-tenant). Apenas super_admin pode usar.
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

    // ----- Validação de JWT super_admin -----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Não autorizado");

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !user) throw new Error("Não autorizado");

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Acesso negado - apenas super-admin");

    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { data, error } = await admin
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, clients: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { name, slug, notes, adminUsername, adminPassword, adminFullName, monthlyFee, dueDay } = body;
      if (!name || !slug || !adminUsername || !adminPassword) {
        throw new Error("Campos obrigatórios: name, slug, adminUsername, adminPassword");
      }

      // 1. Cria cliente
      const { data: client, error: clientErr } = await admin
        .from("clients")
        .insert({
          name,
          slug: slug.toLowerCase().trim(),
          notes: notes ?? null,
          active: true,
          monthly_fee: typeof monthlyFee === "number" ? monthlyFee : 0,
          due_day: typeof dueDay === "number" ? dueDay : 5,
        })
        .select()
        .single();
      if (clientErr) throw clientErr;

      // 2. Cria usuário admin do cliente
      const email = `${adminUsername.toLowerCase().trim()}@${slug.toLowerCase().trim()}.tarmfood.local`;
      const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
        email,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminFullName || adminUsername },
      });
      if (userErr) {
        // rollback do cliente
        await admin.from("clients").delete().eq("id", client.id);
        throw userErr;
      }
      const userId = newUser.user!.id;

      // 3. Profile
      const { error: profErr } = await admin.from("profiles").upsert({
        id: userId,
        full_name: adminFullName || adminUsername,
        username: adminUsername.toLowerCase().trim(),
        client_id: client.id,
      });
      if (profErr) {
        await admin.auth.admin.deleteUser(userId);
        await admin.from("clients").delete().eq("id", client.id);
        throw profErr;
      }

      // 4. Role admin
      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: userId,
        role: "admin",
        client_id: client.id,
      });
      if (roleErr) {
        await admin.auth.admin.deleteUser(userId);
        await admin.from("clients").delete().eq("id", client.id);
        throw roleErr;
      }

      // 5. Seed de configurações padrão (taxas / modo / impressora)
      await admin.from("payment_rates").insert([
        { client_id: client.id, payment_method: "credito", rate_percentage: 3.5 },
        { client_id: client.id, payment_method: "debito", rate_percentage: 1.5 },
      ]);
      await admin.from("system_settings").insert([
        { client_id: client.id, key: "operation_mode", value: "display" },
        { client_id: client.id, key: "tax_payer_credito", value: "cliente" },
        { client_id: client.id, key: "tax_payer_debito", value: "estabelecimento" },
      ]);
      await admin.from("printer_config").insert({
        client_id: client.id,
        printer_type: "thermal",
        connection_type: "network",
        ip_address: "192.168.1.100",
        port: "9100",
        printer_name: "Impressora",
        paper_width: "80mm",
      });

      return new Response(
        JSON.stringify({ success: true, client, admin_user_id: userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const { clientId, name, slug, notes, active, monthlyFee, dueDay } = body;
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name;
      if (slug !== undefined) patch.slug = slug.toLowerCase().trim();
      if (notes !== undefined) patch.notes = notes;
      if (active !== undefined) patch.active = active;
      if (monthlyFee !== undefined) patch.monthly_fee = monthlyFee;
      if (dueDay !== undefined) patch.due_day = dueDay;
      const { error } = await admin.from("clients").update(patch).eq("id", clientId);
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { clientId } = body;
      // ON DELETE CASCADE remove os dados; usuários do auth ficam órfãos — limpar:
      const { data: profs } = await admin
        .from("profiles")
        .select("id")
        .eq("client_id", clientId);
      const { error: delErr } = await admin.from("clients").delete().eq("id", clientId);
      if (delErr) throw delErr;
      for (const p of profs ?? []) {
        try { await admin.auth.admin.deleteUser(p.id); } catch (_e) { /* ignore */ }
      }
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("manage-clients error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
