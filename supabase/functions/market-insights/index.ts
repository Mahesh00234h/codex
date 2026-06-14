import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, openAIErrorResponse, OPENAI_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MarketInsightRequest {
  cropType: string;
  location: { lat: number; lng: number; state?: string };
  currentPrice?: number;
  quantity?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // __LANG_INJECTED__
    const __lang = req.headers.get('x-language-name') || req.headers.get('x-language') || 'English';
    const __langInstruction = `\n\nIMPORTANT: Respond entirely in ${__lang}. All text values, descriptions, names, advice, and JSON string fields MUST be written in ${__lang}. Keep JSON keys and enum values (like 'high','low','open','closed') in English. Numbers, units (₹, kg, °C), and proper nouns can stay as-is.`;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { cropType, location, currentPrice, quantity } = await req.json() as MarketInsightRequest;

    const systemPrompt = `You are an expert agricultural market analyst for Indian farmers. Provide practical, actionable market insights in simple language (Hinglish when appropriate). Focus on helping farmers maximize their profits through smart selling strategies.` + __langInstruction;

    const userPrompt = `Provide market insights for the following:

Crop: ${cropType}
Location: ${location.state || 'India'} (Lat: ${location.lat}, Lng: ${location.lng})
${currentPrice ? `Current selling price: ₹${currentPrice}/quintal` : ''}
${quantity ? `Available quantity: ${quantity} quintals` : ''}

Provide insights in JSON format:
{
  "currentMarketPrice": {
    "minPrice": number,
    "maxPrice": number,
    "averagePrice": number,
    "unit": "per quintal"
  },
  "priceAnalysis": {
    "trend": "rising/falling/stable",
    "percentChange": number,
    "period": "last 30 days"
  },
  "bestTimeToSell": {
    "recommendation": "now/wait/partial",
    "reason": "Explanation",
    "optimalMonth": "Month name"
  },
  "nearbyMandis": [
    {
      "name": "Mandi name",
      "distance": "approximate distance",
      "currentPrice": number,
      "demand": "high/medium/low"
    }
  ],
  "priceForcast": {
    "nextWeek": { "min": number, "max": number },
    "nextMonth": { "min": number, "max": number }
  },
  "sellingTips": [
    "Tip 1",
    "Tip 2"
  ],
  "demandFactors": [
    "Factor affecting demand 1",
    "Factor affecting demand 2"
  ],
  "storageAdvice": "Advice on storage if waiting to sell",
  "governmentMSP": number or null
}`;

    const response = await callOpenAIChat({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
    });

    if (!response.ok) {
      const errorResponse = await openAIErrorResponse(response, corsHeaders);
      if (errorResponse) return errorResponse;
      throw new Error("Failed to get market insights");
    }

    const content = await getOpenAIChatContent(response);

    if (!content) {
      throw new Error("Empty response from AI");
    }

    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Market insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
