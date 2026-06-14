import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { offlineDb, OfflineNotification } from '@/lib/offlineDb';
import { syncService } from '@/lib/syncService';

export function useOfflineNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<OfflineNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      // Try to fetch from server first if online
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          // Update local cache
          const offlineNotifications: OfflineNotification[] = data.map(n => ({
            ...n,
            _synced: true,
          }));

          await offlineDb.notifications.bulkPut(offlineNotifications);
          setNotifications(offlineNotifications);
          setUnreadCount(offlineNotifications.filter(n => !n.is_read).length);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to local cache
      const localNotifications = await offlineDb.notifications
        .where('user_id')
        .equals(user.id)
        .reverse()
        .sortBy('created_at');

      setNotifications(localNotifications);
      setUnreadCount(localNotifications.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    fetchNotifications();

    // Subscribe to realtime updates only if online
    if (navigator.onLine) {
      channelRef.current = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const newNotification: OfflineNotification = {
              ...(payload.new as OfflineNotification),
              _synced: true,
            };
            
            // Save to local cache
            await offlineDb.notifications.put(newNotification);
            
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const updated: OfflineNotification = {
              ...(payload.new as OfflineNotification),
              _synced: true,
            };
            
            // Update local cache
            await offlineDb.notifications.put(updated);
            
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            setNotifications((prev) => {
              setUnreadCount(prev.filter((n) => !n.is_read).length);
              return prev;
            });
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      // Update locally first
      await offlineDb.notifications.update(notificationId, { 
        is_read: true,
        _synced: !navigator.onLine,
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (navigator.onLine) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add to sync queue if offline
        await syncService.addToSyncQueue({
          table: 'notifications',
          operation: 'update',
          data: { id: notificationId, is_read: true },
        });
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      // Update all locally
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const n of unreadNotifications) {
        await offlineDb.notifications.update(n.id, { 
          is_read: true,
          _synced: !navigator.onLine,
        });
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);

      if (navigator.onLine) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
      } else {
        // Add to sync queue if offline
        for (const n of unreadNotifications) {
          await syncService.addToSyncQueue({
            table: 'notifications',
            operation: 'update',
            data: { id: n.id, is_read: true },
          });
        }
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [user, notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
