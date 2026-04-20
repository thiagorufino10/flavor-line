import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validar usuário (admin do cliente)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve client_id e checa role admin
    const { data: profile } = await admin
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.client_id) {
      return new Response(
        JSON.stringify({ error: "Usuário sem cliente vinculado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerar imagens" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const categoryName: string = (body?.categoryName || "").toString().trim();
    const categoryId: string | undefined = body?.categoryId;
    if (!categoryName) {
      return new Response(
        JSON.stringify({ error: "categoryName é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gera imagem via Lovable AI Gateway (Nano Banana)
    const prompt = `Ilustração colorida, estilo flat moderno, fundo branco, de uma categoria de comida chamada "${categoryName}". Imagem central única, sem texto, sem palavras, sem letras, sem logotipos. Deve representar visualmente o que é "${categoryName}" de forma apetitosa e clara. Composição centralizada, alta qualidade.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI error:", aiResp.status, text);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar imagem com a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResp.json();
    const dataUrl: string | undefined =
      aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      console.error("Resposta IA sem imagem:", JSON.stringify(aiData).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "IA não retornou imagem" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Decode base64
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Formato de imagem inválido" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const mime = match[1];
    const ext = mime.split("/")[1].replace("+xml", "");
    const b64 = match[2];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const fileName = `${profile.client_id}/${categoryId || crypto.randomUUID()}-${Date.now()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("category-images")
      .upload(fileName, bytes, { contentType: mime, upsert: true });

    if (upErr) {
      console.error("Upload error:", upErr);
      return new Response(
        JSON.stringify({ error: "Falha ao salvar imagem no storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pub } = admin.storage.from("category-images").getPublicUrl(fileName);
    const imageUrl = pub.publicUrl;

    // Se categoryId fornecido, atualiza diretamente
    if (categoryId) {
      await admin
        .from("categories")
        .update({ image_url: imageUrl })
        .eq("id", categoryId)
        .eq("client_id", profile.client_id);
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-category-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
