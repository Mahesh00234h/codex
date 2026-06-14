import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { langHeaders, getCurrentLangName } from '@/lib/language';
import { DEMO_DATA_MODE } from '@/lib/backendMode';
import { toast } from 'sonner';

export interface GovScheme {
  id: string;
  name: string;
  ministry: string;
  benefit: string;
  deadline: string;
  eligibility: string[];
  status: 'open' | 'closing-soon' | 'closed';
  category: string;
  applicationUrl?: string;
  description?: string;
}

interface UseGovSchemesOptions {
  query?: string;
  state?: string;
  category?: string;
}

export function useGovSchemes() {
  const [schemes, setSchemes] = useState<GovScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemes = useCallback(async (options: UseGovSchemesOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        const demoSchemes: GovScheme[] = [
          {
            id: 'pm-kisan-demo',
            name: 'PM-KISAN',
            ministry: 'Ministry of Agriculture and Farmers Welfare',
            benefit: 'Rs.6,000 per year',
            deadline: 'Open all year',
            eligibility: ['Small and marginal farmer family', 'Valid land records', 'Aadhaar-linked bank account'],
            status: 'open',
            category: 'Direct Benefit',
            applicationUrl: 'https://pmkisan.gov.in/',
            description: 'Income support for eligible farmer families.',
          },
          {
            id: 'pmfby-demo',
            name: 'Pradhan Mantri Fasal Bima Yojana',
            ministry: 'Ministry of Agriculture and Farmers Welfare',
            benefit: 'Crop insurance premium support',
            deadline: 'Before seasonal cut-off',
            eligibility: ['Cultivator of notified crop', 'Application before season deadline'],
            status: 'closing-soon',
            category: 'Insurance',
            applicationUrl: 'https://pmfby.gov.in/',
            description: 'Insurance coverage for crop loss due to notified risks.',
          },
          {
            id: 'kcc-demo',
            name: 'Kisan Credit Card',
            ministry: 'Department of Financial Services',
            benefit: 'Short-term crop credit',
            deadline: 'Open all year',
            eligibility: ['Farmer, tenant farmer, or sharecropper', 'Basic KYC documents'],
            status: 'open',
            category: 'Credit',
            description: 'Credit access for crop cultivation and allied farm needs.',
          },
        ];

        const query = options.query?.toLowerCase().trim();
        const category = options.category;
        const filtered = demoSchemes.filter((scheme) => {
          const matchesQuery = !query
            || scheme.name.toLowerCase().includes(query)
            || scheme.description?.toLowerCase().includes(query)
            || scheme.category.toLowerCase().includes(query);
          const matchesCategory = !category || scheme.category === category;
          return matchesQuery && matchesCategory;
        });
        setSchemes(filtered);
        return filtered;
      }

      const { data, error: functionError } = await supabase.functions.invoke('gov-schemes', { body: {
          query: options.query || '',
          state: options.state || '',
          category: options.category || '',
          language: getCurrentLangName(),
        },
        headers: langHeaders(),
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const fetchedSchemes = data.schemes || [];
      setSchemes(fetchedSchemes);
      return fetchedSchemes;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schemes';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchSchemes = useCallback(async (query: string) => {
    return fetchSchemes({ query });
  }, [fetchSchemes]);

  return {
    schemes,
    isLoading,
    error,
    fetchSchemes,
    searchSchemes,
  };
}
