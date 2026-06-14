import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface WeatherRequest {
  lat: number;
  lng: number;
}

function mapCondition(code: number): string {
  if (code === 0) return "Sunny";
  if ([1, 2].includes(code)) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
}

function describeCondition(code: number): string {
  const descriptions: Record<number, string> = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    80: "slight rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "heavy thunderstorm with hail",
  };
  return descriptions[code] || mapCondition(code).toLowerCase();
}

function dayLabel(dateText: string, index: number): string {
  if (index === 1) return "Tomorrow";
  return new Date(dateText).toLocaleDateString("en-US", { weekday: "short" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json() as WeatherRequest;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: "Latitude and longitude are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,visibility,precipitation");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,precipitation_sum,sunrise,sunset");
    url.searchParams.set("forecast_days", "5");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url);
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch weather" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const current = data.current || {};
    const daily = data.daily || {};
    const currentCode = Number(current.weather_code ?? daily.weather_code?.[0] ?? 3);
    const rainfall = Math.round((daily.precipitation_sum || []).reduce((sum: number, value: number) => sum + Number(value || 0), 0) / 5 * 30);
    const sunrise = daily.sunrise?.[0] ? Math.floor(new Date(daily.sunrise[0]).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const sunset = daily.sunset?.[0] ? Math.floor(new Date(daily.sunset[0]).getTime() / 1000) : Math.floor(Date.now() / 1000);

    const forecast = (daily.time || []).slice(1, 5).map((dateText: string, index: number) => ({
      day: dayLabel(dateText, index + 1),
      temp: Math.round(Number(daily.temperature_2m_max?.[index + 1] ?? current.temperature_2m ?? 0)),
      condition: mapCondition(Number(daily.weather_code?.[index + 1] ?? currentCode)),
    }));

    return new Response(JSON.stringify({
      temperature: Math.round(Number(current.temperature_2m ?? 0)),
      feelsLike: Math.round(Number(current.apparent_temperature ?? current.temperature_2m ?? 0)),
      humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
      windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
      rainfall,
      condition: mapCondition(currentCode),
      description: describeCondition(currentCode),
      location: `Farm location (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      pressure: Math.round(Number(current.pressure_msl ?? 1010)),
      visibility: Math.round(Number(current.visibility ?? 10000) / 1000),
      sunrise,
      sunset,
      forecast,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weather function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
