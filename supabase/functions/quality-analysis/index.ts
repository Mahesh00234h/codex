import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, openAIErrorResponse, OPENAI_VISION_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface QualityAnalysisRequest {
  imageBase64: string;
  productType: string;
  productName?: string;
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

    const { imageBase64, productType, productName } = await req.json() as QualityAnalysisRequest;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert agricultural product quality analyst. Analyze product images to assess freshness, quality, and provide a quality score. Be fair, consistent, and provide actionable feedback to help farmers improve their product presentation.` + __langInstruction;

    const userPrompt = `Analyze this ${productType} product image${productName ? ` (${productName})` : ''} and provide a quality assessment.

Evaluate based on:
- Visual appearance and color
- Freshness indicators
- Size uniformity (if applicable)
- Damage or defects
- Overall presentation quality

Provide assessment as JSON:
{
  "qualityScore": number (0-100),
  "grade": "A+/A/B/C/D",
  "freshness": {
    "level": "excellent/good/fair/poor",
    "estimatedShelfLife": "X days"
  },
  "appearance": {
    "color": "description",
    "uniformity": "high/medium/low",
    "cleanliness": "excellent/good/fair/poor"
  },
  "defects": [
    {
      "type": "defect type",
      "severity": "minor/moderate/major",
      "percentage": "% of product affected"
    }
  ],
  "strengths": [
    "Positive aspect 1",
    "Positive aspect 2"
  ],
  "improvements": [
    "Suggestion to improve quality/presentation 1",
    "Suggestion to improve quality/presentation 2"
  ],
  "marketability": {
    "score": number (0-100),
    "targetMarket": "premium/standard/budget",
    "pricingAdvice": "Pricing recommendation"
  },
  "verificationBadge": {
    "eligible": true/false,
    "reason": "Why eligible or not"
  },
  "summary": "Brief overall quality summary"
}`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await callOpenAIChat({
        model: OPENAI_VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
    });

    if (!response.ok) {
      const errorResponse = await openAIErrorResponse(response, corsHeaders);
      if (errorResponse) return errorResponse;
      throw new Error("Failed to analyze image");
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
    console.error("Quality analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
