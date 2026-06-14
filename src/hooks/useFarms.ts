import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DEMO_DATA_MODE, isMissingBackendError } from '@/lib/backendMode';

interface Farm {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  area_acres: number;
  soil_type?: string;
  location_address?: string;
  created_at: string;
  updated_at: string;
}

interface CreateFarmParams {
  name: string;
  coordinates: { lat: number; lng: number }[];
  area_acres: number;
  soil_type?: string;
  location_address?: string;
}

export function useFarms() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        setFarms([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Type assertion for JSONB coordinates
      const typedFarms = (data || []).map(farm => ({
        ...farm,
        coordinates: farm.coordinates as { lat: number; lng: number }[],
      }));

      setFarms(typedFarms);
    } catch (err) {
      if (isMissingBackendError(err)) {
        setFarms([]);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch farms';
      setError(message);
      console.error('Error fetching farms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const createFarm = async (params: CreateFarmParams) => {
    if (!user) {
      toast.error('Please login to save your farm');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        toast.error('Database is not initialized yet. Run supabase/farmer_only_setup.sql first.');
        return null;
      }

      const { data, error: insertError } = await supabase
        .from('farms')
        .insert({
          user_id: user.id,
          name: params.name,
          coordinates: params.coordinates,
          area_acres: params.area_acres,
          soil_type: params.soil_type,
          location_address: params.location_address,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newFarm = {
        ...data,
        coordinates: data.coordinates as { lat: number; lng: number }[],
      };

      setFarms(prev => [newFarm, ...prev]);
      toast.success('Farm saved successfully!');
      return newFarm;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save farm';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateFarm = async (id: string, updates: Partial<CreateFarmParams>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        toast.error('Database is not initialized yet. Run supabase/farmer_only_setup.sql first.');
        return null;
      }

      const { data, error: updateError } = await supabase
        .from('farms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedFarm = {
        ...data,
        coordinates: data.coordinates as { lat: number; lng: number }[],
      };

      setFarms(prev => prev.map(farm => farm.id === id ? updatedFarm : farm));
      toast.success('Farm updated successfully!');
      return updatedFarm;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update farm';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFarm = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_DATA_MODE) {
        toast.error('Database is not initialized yet. Run supabase/farmer_only_setup.sql first.');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('farms')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setFarms(prev => prev.filter(farm => farm.id !== id));
      toast.success('Farm deleted successfully!');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete farm';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    farms,
    isLoading,
    error,
    fetchFarms,
    createFarm,
    updateFarm,
    deleteFarm,
  };
}
