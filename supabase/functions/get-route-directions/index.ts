import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-language, x-language-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RouteRequest {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  profile?: "driving-car" | "cycling-regular" | "foot-walking";
}

function haversineMeters(start: RouteRequest["start"], end: RouteRequest["end"]): number {
  const radius = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallbackRoute(start: RouteRequest["start"], end: RouteRequest["end"]) {
  const distance = Math.round(haversineMeters(start, end) * 1.25);
  return {
    geometry: [
      [start.lat, start.lng],
      [(start.lat + end.lat) / 2, (start.lng + end.lng) / 2],
      [end.lat, end.lng],
    ],
    distance,
    duration: Math.round(distance / 8.3),
    steps: [
      { instruction: "Start from the pickup point", distance: Math.round(distance * 0.2), duration: Math.round(distance * 0.2 / 8.3), type: 12, name: "Start", way_points: [0, 1] },
      { instruction: "Continue toward the destination", distance: Math.round(distance * 0.75), duration: Math.round(distance * 0.75 / 8.3), type: 0, name: "Route", way_points: [1, 2] },
      { instruction: "Arrive at destination", distance: Math.round(distance * 0.05), duration: Math.round(distance * 0.05 / 8.3), type: 11, name: "Destination", way_points: [2, 2] },
    ],
  };
}

function instructionFromStep(step: any): string {
  const maneuver = step.maneuver || {};
  const modifier = maneuver.modifier ? `${maneuver.modifier} ` : "";
  const road = step.name ? ` onto ${step.name}` : "";
  if (maneuver.type === "arrive") return "Arrive at destination";
  if (maneuver.type === "depart") return `Start${road}`;
  if (maneuver.type === "turn") return `Turn ${modifier.trim()}${road}`.trim();
  if (maneuver.type === "roundabout") return `Enter roundabout${road}`;
  return `Continue ${modifier}${road}`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { start, end, profile = "driving-car" }: RouteRequest = await req.json();
    if (!Number.isFinite(start?.lat) || !Number.isFinite(start?.lng) || !Number.isFinite(end?.lat) || !Number.isFinite(end?.lng)) {
      throw new Error("Invalid coordinates provided");
    }

    const osrmProfile = profile === "foot-walking" ? "foot" : profile === "cycling-regular" ? "bike" : "driving";
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("OSRM error:", await response.text());
      return new Response(JSON.stringify({ success: true, route: fallbackRoute(start, end), source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) {
      return new Response(JSON.stringify({ success: true, route: fallbackRoute(start, end), source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geometry = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    const steps = (route.legs?.[0]?.steps || []).map((step: any, index: number) => ({
      instruction: instructionFromStep(step),
      distance: step.distance,
      duration: step.duration,
      type: index === 0 ? 12 : step.maneuver?.type === "arrive" ? 11 : 0,
      name: step.name || "",
      way_points: [0, 0],
    }));

    return new Response(JSON.stringify({
      success: true,
      source: "osrm",
      route: {
        geometry,
        distance: route.distance,
        duration: route.duration,
        steps,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Route directions error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
