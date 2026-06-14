import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

interface VetProfile {
  id: string;
  user_id: string;
  license_number: string;
  specialization?: string;
  experience_years: number;
  consultation_fee: number;
  is_verified: boolean;
  is_available: boolean;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  certificate_url?: string;
  rating: number;
  total_consultations: number;
  created_at: string;
  updated_at: string;
  distance?: number;
}

export function useNearbyVets() {
  const [vets, setVets] = useState<VetProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNearbyVets = useCallback(async (lat?: number, lng?: number) => {
    setIsLoading(true);
    try {
      if (DEMO_DATA_MODE) {
        const demoVets: VetProfile[] = [
          {
            id: 'demo-vet-1',
            user_id: 'demo-vet-user-1',
            license_number: 'DEMO-VET-001',
            specialization: 'Crop and Livestock Health',
            experience_years: 9,
            consultation_fee: 299,
            is_verified: true,
            is_available: true,
            location_lat: 19.9975,
            location_lng: 73.7898,
            location_address: 'Nashik, Maharashtra',
            certificate_url: undefined,
            rating: 4.8,
            total_consultations: 180,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'demo-vet-2',
            user_id: 'demo-vet-user-2',
            license_number: 'DEMO-VET-002',
            specialization: 'Dairy Animal Care',
            experience_years: 6,
            consultation_fee: 199,
            is_verified: true,
            is_available: true,
            location_lat: 20.011,
            location_lng: 73.76,
            location_address: 'Nearby rural clinic',
            certificate_url: undefined,
            rating: 4.6,
            total_consultations: 95,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        if (lat && lng) {
          setVets(demoVets.map((vet) => ({
            ...vet,
            distance: calculateDistance(lat, lng, vet.location_lat!, vet.location_lng!),
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
        } else {
          setVets(demoVets);
        }
        return;
      }

      const { data, error } = await supabase
        .from('vet_profiles')
        .select('*')
        .eq('is_verified', true)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null);

      if (error) throw error;

      if (lat && lng && data) {
        const withDistance = data.map((vet) => ({
          ...vet,
          distance: calculateDistance(lat, lng, vet.location_lat!, vet.location_lng!),
        }));
        withDistance.sort((a, b) => a.distance - b.distance);
        setVets(withDistance);
      } else {
        setVets(data || []);
      }
    } catch (err) {
      console.error('Error fetching vets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { vets, isLoading, fetchNearbyVets };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
