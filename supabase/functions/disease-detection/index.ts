import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, openAIErrorResponse, OPENAI_VISION_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DiseaseDetectionRequest {
  imageBase64: string;
  plantType?: string;
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

    const { imageBase64, plantType } = await req.json() as DiseaseDetectionRequest;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert plant pathologist and agricultural disease specialist. Analyze plant images to detect diseases, pests, or nutrient deficiencies. Provide practical treatment advice suitable for Indian farmers. Always include a confidence score and recommend veterinary/expert consultation when confidence is below 70%.` + __langInstruction;

    const userPrompt = `Analyze this plant image for any diseases, pests, or health issues.
${plantType ? `The plant type is: ${plantType}` : "Please first identify the plant type."}

Provide your analysis in the following JSON format:
{
  "plantIdentified": "Name of the plant",
  "isHealthy": true/false,
  "disease": {
    "name": "Disease name if detected, or 'Healthy' if no disease",
    "confidence": 85,
    "severity": "low/medium/high",
    "description": "Brief description of the disease and its causes"
  },
  "symptoms": ["symptom1", "symptom2"],
  "cure": [
    "Step 1: Immediate action",
    "Step 2: Treatment details with dosage",
    "Step 3: Follow-up care"
  ],
  "prevention": [
    "Prevention tip 1",
    "Prevention tip 2"
  ],
  "organicRemedies": [
    "Natural remedy 1",
    "Natural remedy 2"
  ],
  "chemicalTreatment": {
    "product": "Primary recommended pesticide/fungicide name",
    "dosage": "Dosage per liter of water",
    "frequency": "Application frequency"
  },
  "recommendedMedicines": [
    {
      "name": "Brand/generic product name commonly available in Indian agri-input stores",
      "activeIngredient": "Chemical active ingredient (e.g., Mancozeb 75% WP)",
      "type": "fungicide/insecticide/bactericide/nutrient",
      "dosage": "e.g., 2g per liter of water",
      "applicationMethod": "foliar spray / soil drench / seed treatment",
      "frequency": "e.g., Every 7-10 days, 2-3 sprays",
      "estimatedPriceINR": "e.g., 250-400 per 500g pack",
      "safety": {
        "preHarvestInterval": "e.g., 14 days before harvest",
        "protectiveGear": "Gloves, mask, full sleeves recommended",
        "warnings": "Toxic to bees / fish / avoid windy conditions"
      },
      "organicAlternative": {
        "name": "e.g., Neem oil 1500 ppm",
        "dosage": "e.g., 5ml per liter",
        "notes": "Safer, may need more frequent application"
      }
    }
  ],
  "searchKeywords": ["pesticide shop", "agri input store", "krishi seva kendra"],
  "escalateToVet": true/false,
  "escalationReason": "Reason for recommending expert consultation if applicable",
  "additionalNotes": "Any other important observations"
}`;

    // Clean base64 string - remove data URL prefix if present
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

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid response format from AI");
    }

    // Add escalation flag if confidence is low
    if (analysis.disease?.confidence < 70) {
      analysis.escalateToVet = true;
      analysis.escalationReason = analysis.escalationReason || 
        "Low confidence score. Please consult an agricultural expert or veterinary doctor for accurate diagnosis.";
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Disease detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
