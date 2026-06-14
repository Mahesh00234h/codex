import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { langHeaders, getCurrentLangName } from '@/lib/language';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';

interface MarketInsights {
  currentMarketPrice: {
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    unit: string;
  };
  priceAnalysis: {
    trend: 'rising' | 'falling' | 'stable';
    percentChange: number;
    period: string;
  };
  bestTimeToSell: {
    recommendation: 'now' | 'wait' | 'partial';
    reason: string;
    optimalMonth: string;
  };
  nearbyMandis: Array<{
    name: string;
    distance: string;
    currentPrice: number;
    demand: 'high' | 'medium' | 'low';
  }>;
  priceForcast: {
    nextWeek: { min: number; max: number };
    nextMonth: { min: number; max: number };
  };
  sellingTips: string[];
  demandFactors: string[];
  storageAdvice: string;
  governmentMSP: number | null;
}

export function useMarketInsights() {
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<MarketInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getMarketInsights = async (
    cropType: string,
    location: { lat: number; lng: number; state?: string },
    currentPrice?: number,
    quantity?: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        const basePrice = currentPrice || 32;
        const demo: MarketInsights = {
          currentMarketPrice: {
            minPrice: Math.max(1, basePrice - 5),
            maxPrice: basePrice + 8,
            averagePrice: basePrice,
            unit: 'kg',
          },
          priceAnalysis: {
            trend: 'rising',
            percentChange: 6,
            period: 'last 7 days',
          },
          bestTimeToSell: {
            recommendation: quantity && quantity > 500 ? 'partial' : 'now',
            reason: 'Demo mode: local demand is assumed strong this week.',
            optimalMonth: 'Current week',
          },
          nearbyMandis: [
            { name: 'Local APMC Market', distance: '12 km', currentPrice: basePrice + 2, demand: 'high' },
            { name: 'District Wholesale Yard', distance: '28 km', currentPrice: basePrice, demand: 'medium' },
          ],
          priceForcast: {
            nextWeek: { min: basePrice - 2, max: basePrice + 6 },
            nextMonth: { min: basePrice - 4, max: basePrice + 10 },
          },
          sellingTips: ['Grade produce before sale', 'Keep moisture-sensitive produce dry', 'Compare at least two mandis'],
          demandFactors: ['Seasonal demand', 'Weather-driven supply pressure', 'Local festival demand'],
          storageAdvice: 'Store in a cool, shaded, ventilated place and sell damaged produce first.',
          governmentMSP: cropType.toLowerCase().includes('wheat') ? 24 : null,
        };
        setInsights(demo);
        return demo;
      }

      const { data, error: fnError } = await supabase.functions.invoke('market-insights', { body: { cropType, location, currentPrice, quantity, language: getCurrentLangName() }, headers: langHeaders() });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setInsights(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get market insights';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearInsights = () => {
    setInsights(null);
    setError(null);
  };

  return {
    isLoading,
    insights,
    error,
    getMarketInsights,
    clearInsights,
  };
}
