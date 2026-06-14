import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { langHeaders, getCurrentLangName } from '@/lib/language';
import { offlineDb, CachedWeather } from '@/lib/offlineDb';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  feelsLike: number;
  pressure: number;
  visibility: number;
  clouds: number;
  sunrise: number;
  sunset: number;
  location: string;
}

interface ForecastDay {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function useOfflineWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    setIsFromCache(false);

    const cacheId = `${lat.toFixed(2)}_${lng.toFixed(2)}`;

    try {
      if (DEMO_DATA_MODE) {
        setWeather({
          temperature: 28,
          humidity: 72,
          description: 'demo weather',
          icon: '02d',
          windSpeed: 10,
          feelsLike: 30,
          pressure: 1010,
          visibility: 8,
          clouds: 35,
          sunrise: Date.now() / 1000 - 3600,
          sunset: Date.now() / 1000 + 3600,
          location: 'Demo Farm',
        });
        setForecast([
          { date: new Date().toISOString(), temp: 28, tempMin: 24, tempMax: 31, description: 'Partly cloudy', icon: '02d', humidity: 72, windSpeed: 10 },
        ]);
        setIsFromCache(false);
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cached = await offlineDb.cachedWeather.get(cacheId);
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
        if (cacheAge < CACHE_DURATION) {
          const cachedData = cached.data as { weather: WeatherData; forecast: ForecastDay[] };
          setWeather(cachedData.weather);
          setForecast(cachedData.forecast);
          setIsFromCache(true);
          setIsLoading(false);
          
          // If online, fetch fresh data in background
          if (navigator.onLine) {
            fetchFromServer(lat, lng, cacheId);
          }
          return;
        }
      }

      // If offline and no cache, show error
      if (!navigator.onLine) {
        // Try to use stale cache
        if (cached) {
          const cachedData = cached.data as { weather: WeatherData; forecast: ForecastDay[] };
          setWeather(cachedData.weather);
          setForecast(cachedData.forecast);
          setIsFromCache(true);
          setError('Using cached weather data (offline)');
        } else {
          setError('No cached weather data available offline');
        }
        setIsLoading(false);
        return;
      }

      await fetchFromServer(lat, lng, cacheId);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFromServer = async (lat: number, lng: number, cacheId: string) => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('weather', { body: { lat, lng, language: getCurrentLangName() }, headers: langHeaders() });

      if (fetchError) throw fetchError;

      const weatherData: WeatherData = {
        temperature: Math.round(data.current.main.temp),
        humidity: data.current.main.humidity,
        description: data.current.weather[0].description,
        icon: data.current.weather[0].icon,
        windSpeed: data.current.wind.speed,
        feelsLike: Math.round(data.current.main.feels_like),
        pressure: data.current.main.pressure,
        visibility: data.current.visibility,
        clouds: data.current.clouds.all,
        sunrise: data.current.sys.sunrise,
        sunset: data.current.sys.sunset,
        location: data.current.name,
      };

      const forecastData: ForecastDay[] = data.forecast.list
        .filter((_: unknown, index: number) => index % 8 === 0)
        .slice(0, 5)
        .map((day: { dt_txt: string; main: { temp: number; temp_min: number; temp_max: number; humidity: number }; weather: { description: string; icon: string }[]; wind: { speed: number } }) => ({
          date: day.dt_txt,
          temp: Math.round(day.main.temp),
          tempMin: Math.round(day.main.temp_min),
          tempMax: Math.round(day.main.temp_max),
          description: day.weather[0].description,
          icon: day.weather[0].icon,
          humidity: day.main.humidity,
          windSpeed: day.wind.speed,
        }));

      setWeather(weatherData);
      setForecast(forecastData);
      setIsFromCache(false);

      // Cache the data
      const cacheEntry: CachedWeather = {
        id: cacheId,
        lat,
        lng,
        data: { weather: weatherData, forecast: forecastData },
        cached_at: new Date().toISOString(),
      };
      await offlineDb.cachedWeather.put(cacheEntry);
    } catch (err) {
      console.error('Server weather fetch error:', err);
      throw err;
    }
  };

  return {
    weather,
    forecast,
    isLoading,
    error,
    isFromCache,
    fetchWeather,
  };
}
