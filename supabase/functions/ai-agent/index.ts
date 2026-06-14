import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import {
  callOpenAIChat,
  getOpenAIChatContent,
  openAIErrorResponse,
  OPENAI_FAST_MODEL,
  OPENAI_MODEL,
} from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a location. Use for rain, temperature, and farm condition questions.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
          location_name: { type: "string", description: "Human-readable location name" },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_prices",
      description: "Get current product listing prices for crops, produce, mandis, and selling decisions.",
      parameters: {
        type: "object",
        properties: {
          crop: { type: "string", description: "Crop or product name, such as wheat, tomato, or rice" },
        },
        required: ["crop"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_crop_recommendation",
      description: "Get crop recommendations based on season, soil, and farm area.",
      parameters: {
        type: "object",
        properties: {
          season: { type: "string", description: "Growing season: Rabi, Kharif, or Zaid" },
          soil_type: { type: "string", description: "Soil type if known" },
          area_acres: { type: "number", description: "Farm area in acres" },
        },
        required: ["season"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_gov_schemes",
      description: "Search for Indian agricultural schemes, subsidies, crop insurance, and farm credit.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Scheme search query" },
          state: { type: "string", description: "Indian state name for local schemes" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_disease_info",
      description: "Get disease, pest, symptom, and treatment information for crops or farm animals.",
      parameters: {
        type: "object",
        properties: {
          disease_query: { type: "string", description: "Disease name, pest, symptoms, or description" },
          plant_or_animal: { type: "string", description: "Affected crop, plant, or animal type" },
        },
        required: ["disease_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_farm_stats",
      description: "Get the signed-in farmer's farm area, listed products, revenue, orders, and recent detections.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_product",
      description: "List a farmer's produce for sale.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name" },
          category: { type: "string", description: "Vegetables, Fruits, Grains, Dairy, Spices, or Other" },
          price: { type: "number", description: "Price per unit in rupees" },
          quantity: { type: "number", description: "Available quantity" },
          unit: { type: "string", description: "kg, quintal, piece, litre, dozen, or bag" },
          description: { type: "string", description: "Product description" },
        },
        required: ["name", "category", "price", "quantity", "unit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_my_orders",
      description: "Check farmer sales orders or purchases. Use role=seller for farmer sales unless the user asks about buying.",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", enum: ["seller", "buyer"], description: "seller for produce sales, buyer for purchases" },
          status_filter: { type: "string", description: "pending, confirmed, processing, assigned, shipped, delivered, cancelled" },
        },
        required: ["role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_vet_consultation",
      description: "Book a veterinary consultation for livestock or farm animal health issues.",
      parameters: {
        type: "object",
        properties: {
          consultation_type: { type: "string", enum: ["chat", "video"], description: "Consultation type" },
          notes: { type: "string", description: "Problem description" },
        },
        required: ["consultation_type", "notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description: "Update an order status when the farmer owns the order as seller.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Order ID" },
          new_status: { type: "string", enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"], description: "New order status" },
        },
        required: ["order_id", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search available farm products and equipment listings.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Product or equipment query" },
          category: { type: "string", description: "Category filter" },
          max_price: { type: "number", description: "Maximum price filter" },
        },
        required: ["query"],
      },
    },
  },
];

async function executeGetWeather(args: any): Promise<string> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(args.lat));
    url.searchParams.set("longitude", String(args.lng));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation");
    url.searchParams.set("daily", "precipitation_sum");
    url.searchParams.set("forecast_days", "5");
    url.searchParams.set("timezone", "auto");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();
    const current = data.current || {};
    const rainfall = Math.round((data.daily?.precipitation_sum || []).reduce((sum: number, value: number) => sum + Number(value || 0), 0) / 5 * 30);
    return JSON.stringify({
      location: args.location_name || `Farm location (${Number(args.lat).toFixed(2)}, ${Number(args.lng).toFixed(2)})`,
      temperature: current.temperature_2m,
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      condition_code: current.weather_code,
      wind_speed_kmh: current.wind_speed_10m,
      rain_now_mm: current.precipitation || 0,
      monthly_rainfall_estimate_mm: rainfall,
    });
  } catch {
    return JSON.stringify({ error: "Could not fetch weather data" });
  }
}

async function executeGetMarketPrices(args: any): Promise<string> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: products } = await supabase
    .from("products")
    .select("name, price, unit, category, quantity")
    .eq("is_available", true)
    .ilike("name", `%${args.crop}%`)
    .limit(10);

  const listings = products?.length
    ? products
    : (await supabase
      .from("products")
      .select("name, price, unit, category, quantity")
      .eq("is_available", true)
      .ilike("category", `%${args.crop}%`)
      .limit(10)).data || [];

  if (!listings.length) {
    return JSON.stringify({
      message: `No listings found for "${args.crop}".`,
      suggestion: "Try a broader crop name or list your own harvest.",
    });
  }

  const prices = listings.map((p) => Number(p.price));
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  return JSON.stringify({
    crop: args.crop,
    listings: listings.length,
    avg_price: avgPrice.toFixed(2),
    price_range: { min: Math.min(...prices), max: Math.max(...prices) },
    products: listings.map((p) => ({ name: p.name, price: p.price, unit: p.unit, qty: p.quantity })),
  });
}

async function executeGetCropRecommendation(args: any): Promise<string> {
  const res = await callOpenAIChat({
    model: OPENAI_FAST_MODEL,
    messages: [
      { role: "system", content: "You are an agricultural expert. Return strict JSON with top 3 crop recommendations for Indian farmers." },
      { role: "user", content: `Recommend crops for season=${args.season}, soil=${args.soil_type || "unknown"}, area=${args.area_acres || "unknown"} acres. Return JSON: { "crops": [{ "name", "confidence", "yield_per_acre", "water_need", "risk_level", "reason" }] }` },
    ],
    response_format: { type: "json_object" },
  });
  if (!res.ok) return JSON.stringify({ error: "Could not get recommendations" });
  return await getOpenAIChatContent(res) || JSON.stringify({ error: "Could not get recommendations" });
}

async function executeGetGovSchemes(args: any): Promise<string> {
  const res = await callOpenAIChat({
    model: OPENAI_FAST_MODEL,
    messages: [
      { role: "system", content: "You are an expert on Indian agricultural government schemes. Return strict JSON with relevant schemes." },
      { role: "user", content: `Find schemes for "${args.query}"${args.state ? ` in ${args.state}` : ""}. Return JSON: { "schemes": [{ "name", "benefit", "eligibility", "how_to_apply" }] } with max 3 schemes.` },
    ],
    response_format: { type: "json_object" },
  });
  if (!res.ok) return JSON.stringify({ error: "Could not fetch schemes" });
  return await getOpenAIChatContent(res) || JSON.stringify({ error: "Could not fetch schemes" });
}

async function executeGetDiseaseInfo(args: any): Promise<string> {
  const res = await callOpenAIChat({
    model: OPENAI_FAST_MODEL,
    messages: [
      { role: "system", content: "You are a plant pathology and farm animal health expert. Return strict JSON with practical safety-first guidance." },
      { role: "user", content: `Disease info for "${args.disease_query}" affecting ${args.plant_or_animal || "crop, plant, or animal"}. Return JSON: { "disease_name", "symptoms", "cause", "treatment", "prevention", "severity", "consult_expert": boolean }` },
    ],
    response_format: { type: "json_object" },
  });
  if (!res.ok) return JSON.stringify({ error: "Could not fetch disease info" });
  return await getOpenAIChatContent(res) || JSON.stringify({ error: "Could not fetch disease info" });
}

async function executeGetFarmStats(userId: string): Promise<string> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [farms, products, orders, detections] = await Promise.all([
    supabase.from("farms").select("name, area_acres, soil_type").eq("user_id", userId),
    supabase.from("products").select("name, price, quantity, category").eq("farmer_id", userId),
    supabase.from("orders").select("total_price, status").eq("seller_id", userId),
    supabase.from("disease_detections").select("disease_name, severity, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
  ]);
  const totalArea = farms.data?.reduce((sum, farm) => sum + Number(farm.area_acres), 0) || 0;
  const revenue = orders.data?.filter((order) => order.status === "delivered").reduce((sum, order) => sum + Number(order.total_price), 0) || 0;
  return JSON.stringify({
    farms: farms.data?.length || 0,
    total_area_acres: totalArea,
    farm_details: farms.data || [],
    products_listed: products.data?.length || 0,
    total_revenue: revenue,
    pending_orders: orders.data?.filter((order) => order.status === "pending").length || 0,
    recent_detections: detections.data || [],
  });
}

async function executeAddProduct(args: any, userId: string): Promise<string> {
  if (!userId) return JSON.stringify({ error: "You need to be logged in to list a product." });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.from("products").insert({
    farmer_id: userId,
    name: args.name,
    category: args.category,
    price: args.price,
    quantity: args.quantity,
    unit: args.unit || "kg",
    description: args.description || null,
    is_available: true,
  }).select("id, name, price, unit, quantity").single();

  if (error) return JSON.stringify({ error: `Failed to list product: ${error.message}` });
  return JSON.stringify({ success: true, message: `Product "${data.name}" listed successfully.`, product: data });
}

async function executeCheckMyOrders(args: any, userId: string): Promise<string> {
  if (!userId) return JSON.stringify({ error: "You need to be logged in." });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const role = args.role === "buyer" ? "buyer" : "seller";

  let query = role === "seller"
    ? supabase.from("orders").select("id, status, total_price, quantity, created_at, delivery_address").eq("seller_id", userId)
    : supabase.from("orders").select("id, status, total_price, quantity, created_at, delivery_address").eq("buyer_id", userId);

  if (args.status_filter) query = query.eq("status", args.status_filter);
  query = query.order("created_at", { ascending: false }).limit(10);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: `Could not fetch orders: ${error.message}` });
  if (!data?.length) return JSON.stringify({ message: "No orders found.", role });

  return JSON.stringify({
    total_orders: data.length,
    by_status: data.reduce((acc: Record<string, number>, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {}),
    total_value: data.reduce((sum, order) => sum + Number(order.total_price), 0),
    orders: data.map((order) => ({
      id: order.id.slice(0, 8),
      status: order.status,
      amount: order.total_price,
      date: order.created_at,
      address: order.delivery_address,
    })),
  });
}

async function executeBookVetConsultation(args: any, userId: string): Promise<string> {
  if (!userId) return JSON.stringify({ error: "You need to be logged in to book a consultation." });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: vets } = await supabase.from("vet_profiles")
    .select("id, specialization, consultation_fee, rating")
    .eq("is_verified", true)
    .eq("is_available", true)
    .order("rating", { ascending: false })
    .limit(1);

  if (!vets?.length) return JSON.stringify({ error: "No vets are available right now. Please try again later." });

  const vet = vets[0];
  const { data, error } = await supabase.from("consultations").insert({
    farmer_id: userId,
    vet_id: vet.id,
    consultation_type: args.consultation_type || "chat",
    notes: args.notes,
    status: "pending",
  }).select("id, consultation_type, status").single();

  if (error) return JSON.stringify({ error: `Failed to book consultation: ${error.message}` });
  return JSON.stringify({
    success: true,
    message: "Consultation booked. A vet will respond shortly.",
    consultation: data,
    vet_info: { specialization: vet.specialization, fee: vet.consultation_fee, rating: vet.rating },
  });
}

async function executeUpdateOrderStatus(args: any, userId: string): Promise<string> {
  if (!userId) return JSON.stringify({ error: "You need to be logged in." });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await supabase.from("orders").select("id, seller_id, status")
    .eq("id", args.order_id)
    .single();

  if (!order) return JSON.stringify({ error: "Order not found." });
  if (order.seller_id !== userId) return JSON.stringify({ error: "You do not have permission to update this order." });

  const { error } = await supabase.from("orders").update({ status: args.new_status }).eq("id", args.order_id);
  if (error) return JSON.stringify({ error: `Failed to update order: ${error.message}` });
  return JSON.stringify({
    success: true,
    message: `Order ${args.order_id.slice(0, 8)} updated to "${args.new_status}".`,
    previous_status: order.status,
    new_status: args.new_status,
  });
}

async function executeSearchProducts(args: any): Promise<string> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let query = supabase.from("products")
    .select("id, name, price, unit, category, quantity, quality_score, description")
    .eq("is_available", true)
    .ilike("name", `%${args.query}%`);

  if (args.category) query = query.eq("category", args.category);
  if (args.max_price) query = query.lte("price", args.max_price);
  query = query.order("quality_score", { ascending: false, nullsFirst: false }).limit(8);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: `Search failed: ${error.message}` });
  if (data?.length) return JSON.stringify({ results: data.length, products: data });

  const { data: categoryData } = await supabase.from("products")
    .select("id, name, price, unit, category, quantity, quality_score, description")
    .eq("is_available", true)
    .ilike("category", `%${args.query}%`)
    .limit(8);

  if (!categoryData?.length) return JSON.stringify({ message: `No products found for "${args.query}".` });
  return JSON.stringify({ results: categoryData.length, products: categoryData });
}

async function executeTool(name: string, args: any, userId: string): Promise<string> {
  switch (name) {
    case "get_weather": return executeGetWeather(args);
    case "get_market_prices": return executeGetMarketPrices(args);
    case "get_crop_recommendation": return executeGetCropRecommendation(args);
    case "get_gov_schemes": return executeGetGovSchemes(args);
    case "get_disease_info": return executeGetDiseaseInfo(args);
    case "get_farm_stats": return executeGetFarmStats(userId);
    case "add_product": return executeAddProduct(args, userId);
    case "check_my_orders": return executeCheckMyOrders(args, userId);
    case "book_vet_consultation": return executeBookVetConsultation(args, userId);
    case "update_order_status": return executeUpdateOrderStatus(args, userId);
    case "search_products": return executeSearchProducts(args);
    default: return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const languageName = req.headers.get("x-language-name") || req.headers.get("x-language") || "English";
    const languageInstruction = `\n\nLANGUAGE RULE: Detect the user's latest message language and respond entirely in that language. If unclear, default to ${languageName}. Keep JSON keys and enum values in English.`;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { message, context, conversationHistory } = await req.json();

    const systemPrompt = `You are FarmAssist, a domain-specific agricultural agent for Farmaline's farmer workspace.

You help Indian farmers with crop planning, weather advisories, disease and pest triage, market prices, government schemes, produce listings, orders, equipment search, and vet consultation booking.

Use tools proactively for live data or actions. For action tools (add_product, book_vet_consultation, update_order_status), confirm first unless the farmer already gave exact details. When checking orders, use role="seller" unless the farmer explicitly asks about purchases.

For weather, default to lat=20.5937 and lng=78.9629 if no location is provided. Season mapping: Jun-Sep=Kharif, Oct-Feb=Rabi, Mar-May=Zaid.

Use markdown with concise bullets or tables. For medical or veterinary emergencies, recommend immediate professional help.

At the end of every response, include 2-3 next actions in this exact block:

\`\`\`suggestions
- {short label} :: {full prompt the farmer could send}
- {short label} :: {full prompt the farmer could send}
\`\`\`

Current page: ${context?.currentPage || "unknown"}` + languageInstruction;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).slice(-10),
      { role: "user", content: message },
    ];

    const firstResponse = await callOpenAIChat({ model: OPENAI_MODEL, messages, tools, tool_choice: "auto" });
    if (!firstResponse.ok) {
      const errorResponse = await openAIErrorResponse(firstResponse, corsHeaders);
      if (errorResponse) return errorResponse;
      throw new Error(`OpenAI API error: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const firstChoice = firstData.choices?.[0];
    const toolCalls = firstChoice?.message?.tool_calls || [];

    if (!toolCalls.length) {
      const content = firstChoice?.message?.content || "I could not process that request.";
      return new Response(JSON.stringify({ response: content, tools_used: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolResults: string[] = [];
    const toolsUsed: string[] = [];
    for (const toolCall of toolCalls) {
      const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      toolsUsed.push(toolCall.function.name);
      toolResults.push(await executeTool(toolCall.function.name, args, userId));
    }

    const messagesWithTools = [
      ...messages,
      firstChoice.message,
      ...toolCalls.map((toolCall: any, index: number) => ({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResults[index],
      })),
    ];

    const finalResponse = await callOpenAIChat({ model: OPENAI_MODEL, messages: messagesWithTools, stream: true });
    if (!finalResponse.ok) throw new Error(`Final OpenAI call failed: ${finalResponse.status}`);

    const encoder = new TextEncoder();
    const toolInfoEvent = `data: ${JSON.stringify({ tools_used: toolsUsed })}\n\n`;
    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(toolInfoEvent));
        const reader = finalResponse.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
