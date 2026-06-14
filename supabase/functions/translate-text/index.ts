import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, OPENAI_FAST_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी, Devanagari script)",
  mr: "Marathi (मराठी, Devanagari script)",
  te: "Telugu (తెలుగు script)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texts, targetLang } = await req.json() as { texts: string[]; targetLang: string };
    if (!Array.isArray(texts) || !texts.length) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const code = (targetLang || "en").slice(0, 2);
    if (code === "en") {
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const langName = LANG_NAMES[code] || "English";
    const systemPrompt = `You are a UI translation engine for an Indian agriculture app (Farmaline).
Translate each input string from English to ${langName}.
RULES:
- Output JSON: {"translations": ["..."]} with the SAME number of items in the SAME order.
- Keep emojis, numbers, currency symbols (₹, %, °C, kg), proper nouns (Farmaline, brand names), and placeholders (e.g. {{name}}, #order_id) unchanged.
- Use natural, simple wording suitable for rural farmers.
- Never add commentary, only the JSON.`;

    const userPrompt = JSON.stringify({ inputs: texts });

    const response = await callOpenAIChat({
        model: OPENAI_FAST_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("translate err", response.status, t);
      return new Response(JSON.stringify({ translations: texts, error: t }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const content = await getOpenAIChatContent(response) || "{}";
    const parsed = JSON.parse(content);
    let out: string[] = parsed.translations || parsed.outputs || [];
    if (out.length !== texts.length) out = texts;
    return new Response(JSON.stringify({ translations: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
