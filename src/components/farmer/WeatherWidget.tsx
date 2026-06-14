import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Sun, 
  Thermometer, 
  MapPin, 
  Sprout, 
  TrendingUp, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCropRecommendation } from '@/hooks/useCropRecommendation';
import { useFarms } from '@/hooks/useFarms';
import { useWeather, WeatherData } from '@/hooks/useWeather';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const conditionIcons: Record<string, React.ReactNode> = {
  'Sunny': <Sun className="h-8 w-8 text-accent" />,
  'Partly Cloudy': <Cloud className="h-8 w-8 text-info" />,
  'Cloudy': <Cloud className="h-8 w-8 text-muted-foreground" />,
  'Rain': <CloudRain className="h-8 w-8 text-info" />,
  'Drizzle': <Droplets className="h-8 w-8 text-info" />,
  'Thunderstorm': <CloudLightning className="h-8 w-8 text-warning" />,
  'Snow': <CloudSnow className="h-8 w-8 text-blue-200" />,
  'Fog': <CloudFog className="h-8 w-8 text-muted-foreground" />,
};

const smallConditionIcons: Record<string, React.ReactNode> = {
  'Sunny': <Sun className="h-4 w-4 text-accent" />,
  'Partly Cloudy': <Cloud className="h-4 w-4 text-info" />,
  'Cloudy': <Cloud className="h-4 w-4 text-muted-foreground" />,
  'Rain': <CloudRain className="h-4 w-4 text-info" />,
  'Drizzle': <Droplets className="h-4 w-4 text-info" />,
  'Thunderstorm': <CloudLightning className="h-4 w-4 text-warning" />,
  'Snow': <CloudSnow className="h-4 w-4 text-blue-200" />,
  'Fog': <CloudFog className="h-4 w-4 text-muted-foreground" />,
};

// Get current season in India
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 8) return 'Kharif (Monsoon)';
  if (month >= 9 && month <= 1) return 'Rabi (Winter)';
  return 'Zaid (Summer)';
}

export default function WeatherWidget() {
  const { user } = useAuth();
  const { farms } = useFarms();
  const { weather, isLoading: isLoadingWeather, error: weatherError, fetchWeather, refetch } = useWeather();
  const { isLoading: isLoadingAI, recommendations, getRecommendations } = useCropRecommendation();
  
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      .then((coords) => fetchWeather(coords.latitude, coords.longitude))
      .catch((error) => {
        console.error('Geolocation error:', error);
        setLocationError('Unable to get your location. Using default location.');
        fetchWeather(19.9975, 73.7898);
      });
  }, [fetchWeather]);

  const handleGetRecommendations = async () => {
    if (!weather) return;

    // Use first farm if available, otherwise use default location
    const farm = farms[0];
    const farmLocation = farm?.coordinates?.[0] || { lat: 19.9975, lng: 73.7898 };
    const areaAcres = farm?.area_acres || 5;

    await getRecommendations({
      farmLocation,
      areaAcres,
      season: getCurrentSeason(),
      weatherData: {
        temperature: weather.temperature,
        humidity: weather.humidity,
        rainfall: weather.rainfall,
        condition: weather.condition,
      },
      soilType: farm?.soil_type,
    });

    setShowRecommendations(true);
  };

  if (isLoadingWeather && !weather) {
    return (
      <div className="bg-gradient-to-br from-info/20 to-primary/20 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Fetching weather data...</span>
        </div>
      </div>
    );
  }

  if (weatherError && !weather) {
    return (
      <div className="bg-gradient-to-br from-destructive/10 to-warning/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <div>
            <p className="font-medium">Unable to load weather</p>
            <p className="text-sm text-muted-foreground">{weatherError}</p>
          </div>
        </div>
        <Button onClick={refetch} className="mt-4" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="space-y-6">
      {/* Location Error Notice */}
      {locationError && (
        <div className="bg-warning/10 rounded-lg p-3 flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {locationError}
        </div>
      )}

      {/* Weather Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-info/10 via-primary/10 to-accent/10 rounded-2xl p-6 border border-border overflow-hidden relative"
      >
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-info/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          {/* Location & Refresh */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{weather.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary font-medium">{getCurrentSeason()}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={refetch}
                disabled={isLoadingWeather}
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingWeather && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Current weather */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-5xl font-bold">{weather.temperature}°C</p>
              <p className="text-muted-foreground capitalize">
                {weather.description || weather.condition}
              </p>
              <p className="text-sm text-muted-foreground">
                Feels like {weather.feelsLike}°C
              </p>
            </div>
            <div className="flex flex-col items-center">
              {conditionIcons[weather.condition] || <Cloud className="h-12 w-12" />}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-card/50 rounded-xl">
              <Droplets className="h-5 w-5 mx-auto mb-1 text-info" />
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="font-semibold">{weather.humidity}%</p>
            </div>
            <div className="text-center p-3 bg-card/50 rounded-xl">
              <Wind className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="font-semibold">{weather.windSpeed} km/h</p>
            </div>
            <div className="text-center p-3 bg-card/50 rounded-xl">
              <Thermometer className="h-5 w-5 mx-auto mb-1 text-secondary" />
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="font-semibold">{weather.pressure} hPa</p>
            </div>
            <div className="text-center p-3 bg-card/50 rounded-xl">
              <Eye className="h-5 w-5 mx-auto mb-1 text-accent" />
              <p className="text-xs text-muted-foreground">Visibility</p>
              <p className="font-semibold">{weather.visibility} km</p>
            </div>
          </div>

          {/* Monthly Rainfall Estimate */}
          <div className="bg-info/10 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-info" />
              <span className="text-sm">Estimated Monthly Rainfall</span>
            </div>
            <span className="font-semibold text-info">{weather.rainfall} mm</span>
          </div>

          {/* Forecast */}
          {weather.forecast && weather.forecast.length > 0 && (
            <div className="border-t border-border pt-4 mb-4">
              <p className="text-sm font-medium mb-3">Forecast</p>
              <div className="grid grid-cols-4 gap-2">
                {weather.forecast.map((day, index) => (
                  <div key={index} className="text-center p-2 bg-card/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{day.day}</p>
                    <div className="my-1 flex justify-center">
                      {smallConditionIcons[day.condition] || <Cloud className="h-4 w-4" />}
                    </div>
                    <p className="text-sm font-semibold">{day.temp}°</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendation Button */}
          {user && (
            <Button 
              onClick={handleGetRecommendations} 
              disabled={isLoadingAI}
              className="w-full"
            >
              {isLoadingAI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting AI Recommendations...
                </>
              ) : (
                <>
                  <Sprout className="h-4 w-4" />
                  Get AI Crop Recommendations
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>

      {/* AI Recommendations */}
      {showRecommendations && recommendations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* General Advice */}
          {recommendations.generalAdvice && (
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
              <p className="text-sm font-medium text-primary">{recommendations.generalAdvice}</p>
            </div>
          )}

          {/* Weather Warning */}
          {recommendations.weatherWarning && (
            <div className="bg-warning/10 rounded-xl p-4 border border-warning/20 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">{recommendations.weatherWarning}</p>
            </div>
          )}

          {/* Crop Recommendations */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Recommended Crops
            </h3>

            {recommendations.recommendations?.map((crop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-5 border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-bold">{crop.crop}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        crop.riskScore === 'Low' ? "bg-success/10 text-success" :
                        crop.riskScore === 'Medium' ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      )}>
                        {crop.riskScore} Risk
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                        {crop.waterRequirement} Water
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">AI Confidence</p>
                    <p className="text-xl font-bold text-primary">{crop.confidence}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Yield</p>
                      <p className="text-sm font-medium">{crop.expectedYield}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Market Price</p>
                    <p className="text-sm font-medium">{crop.marketPrice}</p>
                  </div>
                </div>

                {/* Reasons to grow */}
                {crop.reasonsToGrow && crop.reasonsToGrow.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Why grow this:</p>
                    <ul className="text-sm space-y-1">
                      {crop.reasonsToGrow.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Best Practices */}
                {crop.bestPractices && crop.bestPractices.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium mb-1">Best Practices:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {crop.bestPractices.slice(0, 2).map((practice, i) => (
                        <li key={i}>• {practice}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Refresh button */}
          <Button 
            variant="outline" 
            onClick={handleGetRecommendations}
            disabled={isLoadingAI}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4" />
            Get New Recommendations
          </Button>
        </motion.div>
      )}
    </div>
  );
}
