import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAIChat, getOpenAIChatContent, openAIErrorResponse, OPENAI_MODEL } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CropRecommendationRequest {
  farmLocation: { lat: number; lng: number };
  areaAcres: number;
  season: string;
  weatherData: {
    temperature: number;
    humidity: number;
    rainfall: number;
    condition: string;
  };
  soilType?: string;
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

    const { farmLocation, areaAcres, season, weatherData, soilType } = await req.json() as CropRecommendationRequest;

    const systemPrompt = `You are an expert agricultural advisor for Indian farmers. Your role is to provide practical, actionable crop recommendations based on local conditions. Always respond in simple, clear language suitable for rural farmers. Include confidence scores for your recommendations.` + __langInstruction;

    const userPrompt = `Based on the following farm conditions, recommend the top 3 crops to grow:

Farm Details:
- Location: Latitude ${farmLocation.lat}, Longitude ${farmLocation.lng}
- Area: ${areaAcres} acres
- Season: ${season}
- Soil Type: ${soilType || "Unknown (please infer from region)"}

Weather Conditions:
- Temperature: ${weatherData.temperature}°C
- Humidity: ${weatherData.humidity}%
- Rainfall: ${weatherData.rainfall}mm expected
- Current condition: ${weatherData.condition}

Please provide recommendations in the following JSON format:
{
  "recommendations": [
    {
      "crop": "Crop Name",
      "confidence": 85,
      "expectedYield": "Expected yield per acre",
      "waterRequirement": "Low/Medium/High",
      "riskScore": "Low/Medium/High",
      "reasonsToGrow": ["reason1", "reason2"],
      "bestPractices": ["practice1", "practice2"],
      "estimatedCost": "Approximate cost per acre in INR",
      "marketPrice": "Current market price range per quintal"
    }
  ],
  "generalAdvice": "Brief overall advice for the farmer",
  "weatherWarning": "Any weather-related warnings if applicable"
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
      throw new Error("Failed to get AI recommendation");
    }

    const content = await getOpenAIChatContent(response);

    if (!content) {
      throw new Error("Empty response from AI");
    }

    let recommendations;
    try {
      recommendations = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid response format from AI");
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Crop recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
