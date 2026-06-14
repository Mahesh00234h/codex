import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { langHeaders, getCurrentLangName } from '@/lib/language';
import { DEMO_DATA_MODE, isMissingBackendError } from '@/lib/backendMode';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  condition: string;
  description: string;
  location: string;
  pressure: number;
  visibility: number;
  sunrise: number;
  sunset: number;
  forecast: {
    day: string;
    temp: number;
    condition: string;
  }[];
}

interface UseWeatherResult {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  fetchWeather: (lat: number, lng: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useWeather(): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);

  const demoWeather = useCallback((lat: number, lng: number): WeatherData => ({
    temperature: 29,
    feelsLike: 31,
    humidity: 68,
    windSpeed: 12,
    rainfall: 86,
    condition: 'Partly Cloudy',
    description: 'demo weather until the weather Edge Function is deployed',
    location: `Demo farm (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
    pressure: 1011,
    visibility: 8,
    sunrise: Math.floor(Date.now() / 1000) - 3600,
    sunset: Math.floor(Date.now() / 1000) + 3600 * 8,
    forecast: [
      { day: 'Tomorrow', temp: 30, condition: 'Rain' },
      { day: 'Tue', temp: 28, condition: 'Cloudy' },
      { day: 'Wed', temp: 31, condition: 'Sunny' },
      { day: 'Thu', temp: 29, condition: 'Partly Cloudy' },
    ],
  }), []);

  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    setLastCoords({ lat, lng });

    try {
      if (DEMO_DATA_MODE) {
        setWeather(demoWeather(lat, lng));
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('weather', { body: { lat, lng, language: getCurrentLangName() }, headers: langHeaders() });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch weather data');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setWeather(data);
    } catch (err) {
      if (isMissingBackendError(err)) {
        setWeather(demoWeather(lat, lng));
        setError(null);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch weather';
      setError(message);
      console.error('Weather fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [demoWeather]);

  const refetch = useCallback(async () => {
    if (lastCoords) {
      await fetchWeather(lastCoords.lat, lastCoords.lng);
    }
  }, [lastCoords, fetchWeather]);

  return {
    weather,
    isLoading,
    error,
    fetchWeather,
    refetch,
  };
}
