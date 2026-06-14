export const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.5";
export const OPENAI_FAST_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || OPENAI_MODEL;
export const OPENAI_VISION_MODEL = Deno.env.get("OPENAI_VISION_MODEL") || OPENAI_MODEL;

export async function callOpenAIChat(body: Record<string, unknown>): Promise<Response> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function openAIErrorResponse(response: Response, corsHeaders: HeadersInit): Promise<Response | null> {
  if (response.ok) return null;

  if (response.status === 429) {
    return new Response(
      JSON.stringify({ error: "OpenAI rate limit or quota exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const errorText = await response.text();
  console.error("OpenAI API error:", response.status, errorText);
  return null;
}

export async function getOpenAIChatContent(response: Response): Promise<string> {
  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || "";
}
