import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { watchPosition, type WatchHandle } from '@/lib/nativeGeolocation';

interface DeliveryLocation {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

interface UseOrderTrackingResult {
  location: DeliveryLocation | null;
  isLoading: boolean;
  error: string | null;
  startTracking: (orderId: string) => void;
  stopTracking: () => void;
}

export function useOrderTracking(): UseOrderTrackingResult {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentOrderIdRef = useRef<string | null>(null);

  const stopTracking = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    currentOrderIdRef.current = null;
    setLocation(null);
  }, []);

  const startTracking = useCallback(async (orderId: string) => {
    // Stop any existing tracking
    stopTracking();
    
    setIsLoading(true);
    setError(null);
    currentOrderIdRef.current = orderId;

    try {
      // Fetch initial location
      const { data, error: fetchError } = await supabase
        .from('delivery_locations')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (data) {
        setLocation({
          ...data,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          heading: data.heading ? Number(data.heading) : null,
          speed: data.speed ? Number(data.speed) : null,
        });
      }

      // Subscribe to realtime updates
      channelRef.current = supabase
        .channel(`delivery-location-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'delivery_locations',
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            if (payload.new && currentOrderIdRef.current === orderId) {
              const newData = payload.new as DeliveryLocation;
              setLocation({
                ...newData,
                latitude: Number(newData.latitude),
                longitude: Number(newData.longitude),
                heading: newData.heading ? Number(newData.heading) : null,
                speed: newData.speed ? Number(newData.speed) : null,
              });
            }
          }
        )
        .subscribe();

    } catch (err) {
      console.error('Error starting order tracking:', err);
      setError(err instanceof Error ? err.message : 'Failed to start tracking');
    } finally {
      setIsLoading(false);
    }
  }, [stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    isLoading,
    error,
    startTracking,
    stopTracking,
  };
}

// Hook for delivery partners to broadcast their location
interface UseLocationBroadcastResult {
  isTracking: boolean;
  startBroadcasting: (orderId: string) => void;
  stopBroadcasting: () => void;
  updateLocation: (lat: number, lng: number, heading?: number, speed?: number) => Promise<void>;
}

export function useLocationBroadcast(): UseLocationBroadcastResult {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const watchHandleRef = useRef<WatchHandle | null>(null);

  const updateLocation = useCallback(async (
    lat: number, 
    lng: number, 
    heading?: number, 
    speed?: number
  ) => {
    if (!currentOrderId || !user) return;

    try {
      const { error } = await supabase
        .from('delivery_locations')
        .upsert({
          order_id: currentOrderId,
          delivery_partner_id: user.id,
          latitude: lat,
          longitude: lng,
          heading: heading ?? null,
          speed: speed ?? null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'order_id',
        });

      if (error) {
        console.error('Error updating location:', error);
      }
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  }, [currentOrderId, user]);

  const startBroadcasting = useCallback(async (orderId: string) => {
    setCurrentOrderId(orderId);
    setIsTracking(true);

    watchHandleRef.current = await watchPosition(
      (coords) => {
        updateLocation(
          coords.latitude,
          coords.longitude,
          coords.heading ?? undefined,
          coords.speed ?? undefined
        );
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [updateLocation]);

  const stopBroadcasting = useCallback(() => {
    if (watchHandleRef.current) {
      watchHandleRef.current.clear();
      watchHandleRef.current = null;
    }
    setIsTracking(false);
    setCurrentOrderId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBroadcasting();
    };
  }, [stopBroadcasting]);

  return {
    isTracking,
    startBroadcasting,
    stopBroadcasting,
    updateLocation,
  };
}
