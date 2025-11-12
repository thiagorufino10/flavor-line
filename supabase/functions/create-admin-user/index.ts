import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // NOTA: Esta função não requer autenticação pois é apenas para criar o usuário admin inicial
    // Em produção, você deve protegê-la ou removê-la após criar o admin
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verifica se o usuário admin já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUser?.users?.find(
      (user) => user.email === "admin@pastelfavorite.local"
    );

    if (adminExists) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário admin já existe",
          user_id: adminExists.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria o usuário admin
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@pastelfavorite.local",
      password: "admin",
      email_confirm: true,
      user_metadata: {
        full_name: "Administrador",
      },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Falha ao criar usuário");
    }

    // Adiciona o role de admin
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Erro ao adicionar role:", roleError);
      throw roleError;
    }

    // O perfil já deve ser criado automaticamente pelo trigger handle_new_user
    // Mas vamos garantir que existe
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        full_name: "Administrador",
      });

    if (profileError) {
      console.error("Erro ao criar perfil:", profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário admin criado com sucesso",
        user_id: newUser.user.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
