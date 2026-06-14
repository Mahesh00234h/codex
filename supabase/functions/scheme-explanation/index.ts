import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, openAIErrorResponse, OPENAI_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SchemeExplanationRequest {
  schemeName: string;
  farmerDetails?: {
    landSize?: number;
    category?: string;
    state?: string;
    crops?: string[];
  };
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

    const { schemeName, farmerDetails } = await req.json() as SchemeExplanationRequest;

    const systemPrompt = `You are an expert on Indian government agricultural schemes and subsidies. Explain schemes in simple Hindi-English mixed language (Hinglish) that rural farmers can easily understand. Be practical and focus on actionable steps.` + __langInstruction;

    const userPrompt = `Explain the "${schemeName}" government scheme for farmers.

${farmerDetails ? `
Farmer Details:
- Land Size: ${farmerDetails.landSize || "Not specified"} acres
- Category: ${farmerDetails.category || "General"}
- State: ${farmerDetails.state || "Not specified"}
- Main Crops: ${farmerDetails.crops?.join(", ") || "Not specified"}
` : ""}

Provide the explanation in the following JSON format:
{
  "schemeName": "Full name of the scheme",
  "schemeNameHindi": "Scheme name in Hindi",
  "summary": "Brief 2-line summary in simple language",
  "benefits": [
    {
      "title": "Benefit title",
      "description": "Detailed description",
      "amount": "Amount if applicable"
    }
  ],
  "eligibility": [
    "Eligibility criterion 1",
    "Eligibility criterion 2"
  ],
  "isEligible": true/false based on farmer details,
  "eligibilityReason": "Why the farmer is/isn't eligible",
  "documentsRequired": [
    "Document 1",
    "Document 2"
  ],
  "applicationSteps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed instructions",
      "where": "Where to go/apply"
    }
  ],
  "onlinePortal": "Website URL if available",
  "helplineNumber": "Helpline number if available",
  "deadline": "Application deadline if any",
  "tips": [
    "Helpful tip 1",
    "Helpful tip 2"
  ]
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
      throw new Error("Failed to get scheme explanation");
    }

    const content = await getOpenAIChatContent(response);

    if (!content) {
      throw new Error("Empty response from AI");
    }

    let explanation;
    try {
      explanation = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid response format from AI");
    }

    return new Response(JSON.stringify(explanation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheme explanation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
