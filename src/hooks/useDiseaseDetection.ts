import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { langHeaders, getCurrentLangName } from '@/lib/language';
import { safeLocalStorage } from '@/lib/safeStorage';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';
import { useOfflineDiseaseDetection } from './useOfflineDiseaseDetection';

interface DiseaseAnalysis {
  plantIdentified: string;
  isHealthy: boolean;
  disease: {
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  };
  symptoms: string[];
  cure: string[];
  prevention: string[];
  organicRemedies: string[];
  chemicalTreatment: {
    product: string;
    dosage: string;
    frequency: string;
  };
  recommendedMedicines?: Array<{
    name: string;
    activeIngredient: string;
    type: string;
    dosage: string;
    applicationMethod: string;
    frequency: string;
    estimatedPriceINR: string;
    safety: {
      preHarvestInterval: string;
      protectiveGear: string;
      warnings: string;
    };
    organicAlternative?: {
      name: string;
      dosage: string;
      notes: string;
    };
  }>;
  searchKeywords?: string[];
  escalateToVet: boolean;
  escalationReason?: string;
  additionalNotes?: string;
}

const createDemoDiseaseAnalysis = (plantType?: string): DiseaseAnalysis => ({
  plantIdentified: plantType?.trim() || 'Tomato plant',
  isHealthy: false,
  disease: {
    name: 'Possible early leaf spot',
    confidence: 82,
    severity: 'medium',
    description:
      'Demo mode analysis based on common field symptoms. Deploy the disease-detection Edge Function for live OpenAI vision diagnosis.',
  },
  symptoms: [
    'Small brown spots on older leaves',
    'Yellowing around affected leaf tissue',
    'Faster spread after humid weather',
  ],
  cure: [
    'Remove heavily affected leaves and keep them away from the field.',
    'Improve airflow by pruning crowded growth.',
    'Spray in the evening and avoid overhead watering for the next few days.',
  ],
  prevention: [
    'Rotate crops each season.',
    'Keep leaves dry while irrigating.',
    'Use clean tools and remove crop residue after harvest.',
  ],
  organicRemedies: [
    'Neem oil at 5 ml per liter of water every 7 days.',
    'Compost tea or diluted buttermilk spray for mild fungal pressure.',
  ],
  chemicalTreatment: {
    product: 'Copper oxychloride 50% WP',
    dosage: '2 g per liter of water',
    frequency: 'Repeat after 7-10 days if symptoms continue',
  },
  recommendedMedicines: [
    {
      name: 'Copper oxychloride 50% WP',
      activeIngredient: 'Copper oxychloride',
      type: 'Protective fungicide',
      dosage: '2 g per liter of water',
      applicationMethod: 'Foliar spray with full leaf coverage',
      frequency: 'Every 7-10 days when disease pressure is high',
      estimatedPriceINR: 'Rs.180-260 per 500 g',
      safety: {
        preHarvestInterval: 'Follow the product label for the crop.',
        protectiveGear: 'Gloves, mask, long sleeves, and eye protection.',
        warnings: 'Do not mix chemicals unless the label allows it.',
      },
      organicAlternative: {
        name: 'Neem oil',
        dosage: '5 ml per liter of water',
        notes: 'Use as a preventive or for mild early symptoms.',
      },
    },
  ],
  searchKeywords: ['tomato leaf spot', 'fungal leaf spot', 'copper oxychloride dosage'],
  escalateToVet: false,
  additionalNotes: 'Demo result for hackathon mode. Run the Supabase setup and deploy functions for live diagnosis.',
});

export function useDiseaseDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineResult, setIsOfflineResult] = useState(false);
  const offline = useOfflineDiseaseDetection();

  const analyzeImage = async (imageBase64: string, plantType?: string) => {
    setIsLoading(true);
    setError(null);
    setIsOfflineResult(false);

    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (DEMO_DATA_MODE) {
      const result = createDemoDiseaseAnalysis(plantType);
      setAnalysis(result);
      setIsOfflineResult(true);
      toast.info('Demo diagnosis generated', {
        description: 'Deploy the disease-detection function for live OpenAI image analysis.',
      });
      setIsLoading(false);
      return result;
    }

    if (!online) {
      try {
        toast.info('Offline mode — using on-device AI', {
          description: 'Will re-analyze with full AI when you reconnect.',
        });
        const result = await offline.analyze(imageBase64);
        setAnalysis(result as unknown as DiseaseAnalysis);
        setIsOfflineResult(true);
        // Queue image for re-analysis when back online
        try {
          const queue = JSON.parse(safeLocalStorage.getItem('disease_reanalyze_queue') || '[]');
          queue.push({ imageBase64, plantType, queuedAt: Date.now() });
          safeLocalStorage.setItem('disease_reanalyze_queue', JSON.stringify(queue.slice(-5)));
        } catch { /* ignore */ }
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Offline analysis failed';
        setError(msg);
        toast.error(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('disease-detection', { body: { imageBase64, plantType, language: getCurrentLangName() }, headers: langHeaders() });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
      
      // Show warning if escalation is recommended
      if (data.escalateToVet) {
        toast.warning('Expert consultation recommended', {
          description: data.escalationReason || 'Low confidence score. Please consult an expert.',
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze image';
      // Online call failed — try offline fallback
      try {
        toast.warning('Network failed — using on-device AI');
        const result = await offline.analyze(imageBase64);
        setAnalysis(result as unknown as DiseaseAnalysis);
        setIsOfflineResult(true);
        return result;
      } catch {
        setError(message);
        toast.error(message);
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
    setIsOfflineResult(false);
  };

  return {
    isLoading,
    analysis,
    error,
    analyzeImage,
    clearAnalysis,
    isOfflineResult,
    offlineModelReady: offline.isReady,
    preloadOfflineModel: offline.preload,
  };
}
