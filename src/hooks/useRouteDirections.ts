import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  type: number;
  name: string;
  way_points: number[];
}

export interface RouteData {
  geometry: [number, number][];
  distance: number;
  duration: number;
  steps: RouteStep[];
}

type RouteProfile = 'driving-car' | 'cycling-regular' | 'foot-walking';

export const getInstructionIcon = (type: number): string => {
  const iconMap: Record<number, string> = {
    0: 'GO',
    1: 'R',
    2: 'L',
    3: 'SR',
    4: 'SL',
    5: 'r',
    6: 'l',
    7: '^',
    8: 'O',
    9: 'O',
    10: 'U',
    11: 'END',
    12: 'START',
    13: 'KL',
    14: 'KR',
  };
  return iconMap[type] || 'PIN';
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

export function useRouteDirections() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    profile: RouteProfile = 'driving-car',
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        const demoRoute: RouteData = {
          geometry: [
            [start.lng, start.lat],
            [(start.lng + end.lng) / 2, (start.lat + end.lat) / 2],
            [end.lng, end.lat],
          ],
          distance: 4200,
          duration: 900,
          steps: [
            {
              instruction: 'Start from the farm location',
              distance: 1000,
              duration: 240,
              type: 12,
              name: 'Farm road',
              way_points: [0, 1],
            },
            {
              instruction: 'Continue toward the delivery point',
              distance: 3000,
              duration: 600,
              type: 0,
              name: 'Main road',
              way_points: [1, 2],
            },
            {
              instruction: 'Arrive at destination',
              distance: 200,
              duration: 60,
              type: 11,
              name: 'Destination',
              way_points: [2, 2],
            },
          ],
        };
        setRoute(demoRoute);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('get-route-directions', {
        body: { start, end, profile },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data.success) throw new Error(data.error || 'Failed to get route');
      setRoute(data.route);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch route';
      setError(errorMessage);
      console.error('Route fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
  }, []);

  return { route, isLoading, error, fetchRoute, clearRoute };
}
