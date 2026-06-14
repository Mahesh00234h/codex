import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callOpenAIChat, getOpenAIChatContent, OPENAI_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Suggestion {
  title: string;
  body: string;
  type: "weather" | "disease" | "market" | "scheme" | "product" | "general";
  url?: string;
  score: number;
}

type UserRole = "farmer";

function routeForSuggestion(role: UserRole | null, suggestion: Suggestion): string {
  const raw = suggestion.url?.startsWith("/") ? suggestion.url : `/${suggestion.url || ""}`;
  const clean = raw.split("?")[0].split("#")[0];

  const allowedPrefixes = ["/farmer", "/track/", "/invoice/"];

  if (!role) return clean || "/";
  return allowedPrefixes.some((prefix) => clean === prefix || clean.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))
    ? raw
    : "/farmer";
}

async function getSuggestionsForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Suggestion[]> {
  // Gather signals in parallel
  const [farmsRes, detectionsRes, ordersRes, recsRes, productsRes, interactionsRes, roleRes] = await Promise.all([
    supabase.from("farms").select("id,name,area_acres,soil_type,coordinates,location_address").eq("user_id", userId).limit(5),
    supabase.from("disease_detections").select("disease_name,severity,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id,status,total_price,created_at").eq("buyer_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("crop_recommendations").select("recommendations,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(2),
    supabase.from("products").select("name,category,price").eq("is_available", true).order("created_at", { ascending: false }).limit(15),
    supabase.from("suggestion_interactions").select("suggestion_type,title,action,score,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
  ]);

  const farms = farmsRes.data || [];
  const detections = detectionsRes.data || [];
  const orders = ordersRes.data || [];
  const recs = recsRes.data || [];
  const products = productsRes.data || [];
  const interactions = (interactionsRes.data || []) as Array<{ suggestion_type: string; title: string | null; action: string; score: number | null }>;
  const role = ((roleRes.data as { role?: UserRole } | null)?.role ?? null);

  // Build a click-through summary per category (Flipkart-style feedback signal)
  const stats: Record<string, { shown: number; clicked: number }> = {};
  for (const i of interactions) {
    const t = i.suggestion_type || "general";
    stats[t] ||= { shown: 0, clicked: 0 };
    if (i.action === "shown") stats[t].shown++;
    if (i.action === "clicked") stats[t].clicked++;
  }
  const ctrSummary = Object.entries(stats).map(([type, s]) => ({
    type,
    shown: s.shown,
    clicked: s.clicked,
    ctr: s.shown ? +(s.clicked / s.shown).toFixed(2) : 0,
  }));
  const recentClicks = interactions.filter((i) => i.action === "clicked").slice(0, 8).map((i) => ({ type: i.suggestion_type, title: i.title }));

  // If user has zero signals, skip
  if (!farms.length && !detections.length && !orders.length) return [];

  const systemPrompt = `You are a recommendation engine for Farmaline, an agri-platform for Indian farmers.
Generate 2-3 personalized, actionable suggestions for the user based on their data signals.
Each suggestion must be timely, specific, and useful (like Zomato/Swiggy push notifications).
Use the click-through history to bias suggestions toward categories the user actually engages with.
Avoid repeating titles the user already saw recently.
Output STRICT JSON only. Never include explanations.`;

  const userPrompt = `User signals:

Farms: ${JSON.stringify(farms.slice(0, 3))}
Recent disease detections: ${JSON.stringify(detections)}
Recent orders: ${JSON.stringify(orders.slice(0, 5))}
Last AI crop recommendations: ${JSON.stringify(recs)}
Trending marketplace products: ${JSON.stringify(products.slice(0, 8))}
Engagement by category (CTR feedback): ${JSON.stringify(ctrSummary)}
Recently clicked suggestions: ${JSON.stringify(recentClicks)}
Current month: ${new Date().toLocaleString("en-IN", { month: "long" })}

Return JSON:
{
  "suggestions": [
    {
      "title": "short title (max 50 chars)",
      "body": "1-2 sentence specific message (max 140 chars)",
      "type": "weather|disease|market|scheme|product|general",
      "url": "/farmer/weather | /farmer/disease | /farmer/trading | /farmer/schemes | /farmer",
      "score": 0-100
    }
  ]
}`;

  const aiRes = await callOpenAIChat({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
  });

  if (!aiRes.ok) {
    console.error("OpenAI API error", aiRes.status, await aiRes.text());
    return [];
  }

  const content = await getOpenAIChatContent(aiRes);
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    const suggestions = (parsed.suggestions || []) as Suggestion[];
    return suggestions
      .filter((s) => s.title && s.body)
      .slice(0, 3)
      .map((s) => ({ ...s, url: routeForSuggestion(role, s) }));
  } catch (e) {
    console.error("Failed to parse AI JSON", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { user_id?: string; mode?: "single" | "digest" } = {};
    try { body = await req.json(); } catch { /* empty body for cron */ }

    // Authorization: derive user from JWT for single-user calls; require service-role for digest
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceCall = !!token && token === serviceKey;

    let userIds: string[] = [];
    if (!isServiceCall) {
      // Authenticated user — they can only request suggestions for themselves
      if (!token) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userIds = [userData.user.id];
    } else if (body.user_id) {
      userIds = [body.user_id];
    } else {
      // Daily digest: all users with smart_suggestions enabled (or no preferences row = default on)
      const { data: optedOut } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("smart_suggestions", false);
      const optedOutSet = new Set((optedOut || []).map((r: any) => r.user_id));

      const { data: profiles } = await supabase.from("profiles").select("user_id");
      userIds = (profiles || [])
        .map((p: any) => p.user_id)
        .filter((id: string) => !optedOutSet.has(id));
    }

    const results: Array<{ user_id: string; sent: number }> = [];

    for (const uid of userIds) {
      try {
        const suggestions = await getSuggestionsForUser(supabase, uid);
        let sent = 0;
        for (const s of suggestions) {
          const { data: inserted, error } = await supabase.from("notifications").insert({
            user_id: uid,
            title: s.title,
            body: s.body,
            notification_type: s.type || "general",
            data: { url: s.url || "/", score: s.score, smart: true, type: s.type || "general", title: s.title },
          }).select("id").single();
          if (!error) {
            sent++;
            // Log impression for the feedback loop
            await supabase.from("suggestion_interactions").insert({
              user_id: uid,
              notification_id: inserted?.id ?? null,
              suggestion_type: s.type || "general",
              title: s.title,
              action: "shown",
              score: s.score,
              url: s.url || null,
            });
          }
        }
        if (sent > 0) {
          await supabase
            .from("notification_preferences")
            .upsert({ user_id: uid, last_digest_at: new Date().toISOString() }, { onConflict: "user_id" });
        }
        results.push({ user_id: uid, sent });
      } catch (err) {
        console.error("Failed user", uid, err);
        results.push({ user_id: uid, sent: 0 });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("smart-suggestions error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
