import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';

interface CropRecommendation {
  crop: string;
  confidence: number;
  expectedYield: string;
  waterRequirement: string;
  riskScore: string;
  reasonsToGrow: string[];
  bestPractices: string[];
  estimatedCost: string;
  marketPrice: string;
}

interface RecommendationResponse {
  recommendations: CropRecommendation[];
  generalAdvice: string;
  weatherWarning?: string;
}

interface CropRecommendationParams {
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

export function useCropRecommendation() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = async (params: CropRecommendationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        const demo: RecommendationResponse = {
          generalAdvice: 'Demo mode: crop recommendations are generated locally until the crop-recommendation function is deployed.',
          weatherWarning: params.weatherData.rainfall > 120
            ? 'High rainfall expected. Prioritize drainage and fungal disease prevention.'
            : undefined,
          recommendations: [
            {
              crop: params.season.includes('Kharif') ? 'Paddy' : 'Wheat',
              confidence: 86,
              expectedYield: '18-24 quintal/acre',
              waterRequirement: 'Medium',
              riskScore: 'Low',
              reasonsToGrow: ['Fits the current season', 'Strong local market demand', 'Works with moderate irrigation'],
              bestPractices: ['Use certified seed', 'Maintain field drainage', 'Monitor for fungal disease after rain'],
              estimatedCost: 'Rs.18,000-24,000/acre',
              marketPrice: 'Rs.24-32/kg',
            },
            {
              crop: 'Tomato',
              confidence: 78,
              expectedYield: '8-12 ton/acre',
              waterRequirement: 'Medium',
              riskScore: 'Medium',
              reasonsToGrow: ['Good short-cycle cash crop', 'Useful for direct market sales'],
              bestPractices: ['Use staking', 'Mulch to conserve moisture', 'Scout leaves every 3-4 days'],
              estimatedCost: 'Rs.35,000-50,000/acre',
              marketPrice: 'Rs.30-45/kg',
            },
          ],
        };
        setRecommendations(demo);
        return demo;
      }

      const { data, error: fnError } = await supabase.functions.invoke('crop-recommendation', {
        body: params,
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearRecommendations = () => {
    setRecommendations(null);
    setError(null);
  };

  return {
    isLoading,
    recommendations,
    error,
    getRecommendations,
    clearRecommendations,
  };
}
