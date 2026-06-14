import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, openAIErrorResponse, OPENAI_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // __LANG_INJECTED__
    const __lang = req.headers.get('x-language-name') || req.headers.get('x-language') || 'English';
    const __langInstruction = `\n\nIMPORTANT: Respond entirely in ${__lang}. All text values, descriptions, names, advice, and JSON string fields MUST be written in ${__lang}. Keep JSON keys and enum values (like 'high','low','open','closed') in English. Numbers, units (₹, kg, °C), and proper nouns can stay as-is.`;
    const { query, state, category } = await req.json();

    const systemPrompt = `You are an expert on Indian Government Agricultural Schemes. Your knowledge includes:
- Central Government schemes (PM-KISAN, PMFBY, KCC, etc.)
- State-specific schemes for all Indian states
- Latest updates and deadlines for scheme applications
- Eligibility criteria and benefits

Always provide accurate, up-to-date information about government schemes for farmers.
Format your response as a valid JSON array of scheme objects with this structure:
{
  "schemes": [
    {
      "id": "unique-id",
      "name": "Scheme Name",
      "ministry": "Ministry/Department Name",
      "benefit": "Main benefit description",
      "deadline": "Application deadline or status",
      "eligibility": ["Eligibility point 1", "Eligibility point 2"],
      "status": "open" | "closing-soon" | "closed",
      "category": "Direct Benefit" | "Insurance" | "Credit" | "Technical" | "Subsidy" | "Training",
      "applicationUrl": "URL to apply (if available)",
      "description": "Detailed description of the scheme"
    }
  ]
}

Include 6-10 relevant schemes based on the query. Prioritize schemes that are currently accepting applications.` + __langInstruction;

    let userPrompt = "List the most relevant and active government agricultural schemes for Indian farmers.";
    
    if (query) {
      userPrompt = `Search for government agricultural schemes related to: "${query}"`;
    }
    if (state) {
      userPrompt += ` Focus on schemes available in ${state} state.`;
    }
    if (category) {
      userPrompt += ` Filter by category: ${category}.`;
    }

    const response = await callOpenAIChat({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
    });

    if (!response.ok) {
      const errorResponse = await openAIErrorResponse(response, corsHeaders);
      if (errorResponse) return errorResponse;
      throw new Error("Failed to fetch schemes from AI");
    }

    const content = await getOpenAIChatContent(response);

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let schemes;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*"schemes"[\s\S]*\}/);
      if (jsonMatch) {
        schemes = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the entire content as JSON
        schemes = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse schemes JSON:", parseError);
      console.log("Raw content:", content);
      // Return fallback schemes if parsing fails
      schemes = {
        schemes: [
          {
            id: "pm-kisan",
            name: "PM-KISAN Samman Nidhi",
            ministry: "Ministry of Agriculture & Farmers Welfare",
            benefit: "₹6,000/year direct income support",
            deadline: "Open Year-round",
            eligibility: ["All landholding farmer families", "Valid Aadhaar card", "Bank account linked"],
            status: "open",
            category: "Direct Benefit",
            description: "Direct income support of ₹6,000 per year in three equal installments to all landholding farmer families."
          },
          {
            id: "pmfby",
            name: "Pradhan Mantri Fasal Bima Yojana",
            ministry: "Ministry of Agriculture & Farmers Welfare",
            benefit: "Crop insurance at subsidized premium",
            deadline: "Before sowing season",
            eligibility: ["All farmers growing notified crops", "Loanee and non-loanee farmers"],
            status: "open",
            category: "Insurance",
            description: "Comprehensive crop insurance scheme providing financial support to farmers in case of crop failure."
          },
          {
            id: "kcc",
            name: "Kisan Credit Card",
            ministry: "NABARD / Ministry of Finance",
            benefit: "Credit up to ₹3 lakh at 4% interest",
            deadline: "Open Year-round",
            eligibility: ["Owner cultivators", "Tenant farmers", "Sharecroppers"],
            status: "open",
            category: "Credit",
            description: "Provides adequate and timely credit to farmers for their agricultural and allied activities."
          }
        ]
      };
    }

    return new Response(
      JSON.stringify(schemes),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Gov schemes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
