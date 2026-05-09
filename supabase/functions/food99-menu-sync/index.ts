// Sync local menu (menu_items + categories) to 99Food / DiDi Open Platform.
// Endpoint URL is read from FOOD99_MENU_SYNC_URL secret (placeholder until docs arrive).
// If secret not set, returns the payload that WOULD be sent (dry-run) so the user can
// validate the format and forward to 99Food support.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_KEY = Deno.env.get("FOOD99_APP_KEY") ?? "";
const APP_SECRET = Deno.env.get("FOOD99_APP_SECRET") ?? "";
const SYNC_URL = Deno.env.get("FOOD99_MENU_SYNC_URL") ?? ""; // optional

function sign(body: string, ts: string) {
  return createHmac("sha256", APP_SECRET)
    .update(`${APP_KEY}${ts}${body}`)
    .digest("hex");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve client_id of caller
    const { data: profile } = await admin
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .maybeSingle();
    const clientId = profile?.client_id;
    if (!clientId) return json({ error: "no_client" }, 400);

    // Verify admin role
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("client_id", clientId);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return json({ error: "forbidden" }, 403);
    }

    // Get 99Food credentials
    const { data: cred } = await admin
      .from("food99_credentials")
      .select("merchant_id, store_token, environment")
      .eq("client_id", clientId)
      .maybeSingle();
    if (!cred?.merchant_id) {
      return json({ error: "credenciais_99food_nao_cadastradas" }, 400);
    }

    // Load active categories + items
    const [{ data: cats }, { data: items }] = await Promise.all([
      admin.from("categories").select("id, name, sort_order")
        .eq("client_id", clientId).eq("active", true).order("sort_order"),
      admin.from("menu_items").select("id, name, description, price, category_id")
        .eq("client_id", clientId).eq("active", true).order("name"),
    ]);

    const payload = {
      appShopId: cred.merchant_id,
      environment: cred.environment,
      categories: (cats ?? []).map((c: any) => ({
        appCategoryId: c.id,
        name: c.name,
        sortOrder: c.sort_order ?? 0,
      })),
      items: (items ?? []).map((i: any) => ({
        appItemId: i.id,            // UUID — 99Food usará este como APPitemID
        appCategoryId: i.category_id,
        name: i.name,
        description: i.description ?? "",
        price: Number(i.price),     // BRL
        currency: "BRL",
        status: "ON_SALE",
      })),
    };

    const body = JSON.stringify(payload);
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = APP_SECRET ? sign(body, ts) : "";

    // If endpoint not configured, return dry-run
    if (!SYNC_URL) {
      return json({
        ok: true,
        dry_run: true,
        message:
          "FOOD99_MENU_SYNC_URL não configurado. Payload abaixo é o que seria enviado. Configure o segredo com a URL oficial do endpoint de sync da 99Food para envio real.",
        items_count: payload.items.length,
        categories_count: payload.categories.length,
        payload,
      });
    }

    // Real call
    const resp = await fetch(SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Key": APP_KEY,
        "X-Timestamp": ts,
        "X-Signature": signature,
        "X-Store-Token": cred.store_token ?? "",
      },
      body,
    });
    const respText = await resp.text();
    let respJson: unknown;
    try { respJson = JSON.parse(respText); } catch { respJson = respText; }

    return json({
      ok: resp.ok,
      status: resp.status,
      items_count: payload.items.length,
      response: respJson,
    });
  } catch (e) {
    console.error("[food99-menu-sync] error", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
