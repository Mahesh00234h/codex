import { useState, useEffect, useCallback } from 'react';
import { syncService } from '@/lib/syncService';
import { offlineDb } from '@/lib/offlineDb';
import { useAuth } from '@/contexts/AuthContext';

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncService.sync().catch((error) => {
        console.warn('Offline sync failed after reconnect:', error);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync on mount if online
    if (typeof navigator !== 'undefined' && navigator.onLine && user) {
      syncService.sync().catch((error) => {
        console.warn('Initial offline sync failed:', error);
      });
    }

    // Update pending count
    const updatePendingCount = async () => {
      try {
        const count = await syncService.getPendingSyncCount();
        setPendingCount(count);
      } catch (error) {
        console.warn('Unable to read offline sync queue:', error);
        setPendingCount(0);
      }
    };

    updatePendingCount();

    // Listen for sync updates
    const unsubscribe = syncService.addSyncListener(() => {
      updatePendingCount();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [user]);

  const manualSync = useCallback(async () => {
    if (!isOnline) {
      return false;
    }

    setIsSyncing(true);
    try {
      await syncService.sync();
      const count = await syncService.getPendingSyncCount();
      setPendingCount(count);
      return true;
    } catch (error) {
      console.warn('Manual offline sync failed:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  const clearOfflineData = useCallback(async () => {
    try {
      await syncService.clearLocalData();
    } catch (error) {
      console.warn('Unable to clear offline data:', error);
    }
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    manualSync,
    clearOfflineData,
  };
}

// Hook for caching weather data offline
export function useCachedWeather() {
  const cacheWeather = useCallback(async (lat: number, lng: number, data: unknown) => {
    const id = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
    await offlineDb.cachedWeather.put({
      id,
      lat,
      lng,
      data,
      cached_at: new Date().toISOString(),
    });
  }, []);

  const getCachedWeather = useCallback(async (lat: number, lng: number) => {
    const id = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const cached = await offlineDb.cachedWeather.get(id);
    
    if (cached) {
      // Check if cache is less than 30 minutes old
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      if (cacheAge < 30 * 60 * 1000) {
        return cached.data;
      }
    }
    
    return null;
  }, []);

  return { cacheWeather, getCachedWeather };
}
