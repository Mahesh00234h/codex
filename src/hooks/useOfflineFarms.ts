import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { offlineDb, generateOfflineId, OfflineFarm } from '@/lib/offlineDb';
import { syncService } from '@/lib/syncService';

interface CreateFarmParams {
  name: string;
  coordinates: { lat: number; lng: number }[];
  area_acres: number;
  soil_type?: string;
  location_address?: string;
}

export function useOfflineFarms() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<OfflineFarm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from server first if online
      if (navigator.onLine) {
        const { data, error: fetchError } = await supabase
          .from('farms')
          .select('*')
          .order('created_at', { ascending: false });

        if (!fetchError && data) {
          // Update local cache
          const offlineFarms: OfflineFarm[] = data.map(farm => ({
            ...farm,
            coordinates: farm.coordinates as { lat: number; lng: number }[],
            _synced: true,
          }));

          await offlineDb.farms.bulkPut(offlineFarms);
          setFarms(offlineFarms);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to local cache
      const localFarms = await offlineDb.farms
        .where('user_id')
        .equals(user.id)
        .reverse()
        .sortBy('created_at');

      setFarms(localFarms.filter(f => !f._deleted));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch farms';
      setError(message);
      console.error('Error fetching farms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFarms();

    // Listen for sync updates
    const unsubscribe = syncService.addSyncListener(() => {
      fetchFarms();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchFarms]);

  const createFarm = async (params: CreateFarmParams) => {
    if (!user) {
      toast.error('Please login to save your farm');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const now = new Date().toISOString();
    const offlineId = generateOfflineId();

    const newFarm: OfflineFarm = {
      id: offlineId,
      user_id: user.id,
      name: params.name,
      coordinates: params.coordinates,
      area_acres: params.area_acres,
      soil_type: params.soil_type,
      location_address: params.location_address,
      created_at: now,
      updated_at: now,
      _synced: false,
    };

    try {
      // Save locally first
      await offlineDb.farms.put(newFarm);
      setFarms(prev => [newFarm, ...prev]);

      // Add to sync queue
      await syncService.addToSyncQueue({
        table: 'farms',
        operation: 'create',
        data: newFarm,
      });

      toast.success(navigator.onLine ? 'Farm saved!' : 'Farm saved offline. Will sync when online.');
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
      const existing = await offlineDb.farms.get(id);
      if (!existing) throw new Error('Farm not found');

      const updatedFarm: OfflineFarm = {
        ...existing,
        ...updates,
        coordinates: updates.coordinates || existing.coordinates,
        updated_at: new Date().toISOString(),
        _synced: false,
      };

      // Update locally
      await offlineDb.farms.put(updatedFarm);
      setFarms(prev => prev.map(farm => farm.id === id ? updatedFarm : farm));

      // Add to sync queue
      await syncService.addToSyncQueue({
        table: 'farms',
        operation: 'update',
        data: updatedFarm,
      });

      toast.success(navigator.onLine ? 'Farm updated!' : 'Farm updated offline. Will sync when online.');
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
      const existing = await offlineDb.farms.get(id);
      if (!existing) throw new Error('Farm not found');

      // Mark as deleted locally
      await offlineDb.farms.update(id, { _deleted: true, _synced: false });
      setFarms(prev => prev.filter(farm => farm.id !== id));

      // Add to sync queue
      await syncService.addToSyncQueue({
        table: 'farms',
        operation: 'delete',
        data: { id },
      });

      toast.success(navigator.onLine ? 'Farm deleted!' : 'Farm deleted offline. Will sync when online.');
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
