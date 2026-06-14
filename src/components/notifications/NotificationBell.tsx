import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X, Settings, Package, MessageSquare, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

const notificationIcons: Record<string, typeof Bell> = {
  order: Package,
  chat: MessageSquare,
  delivery: Truck,
  general: Bell,
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, isLoading: pushLoading } = usePushNotifications();
  const navigate = useNavigate();
  const { user } = useAuth();

  const appRoutes = [
    '/', '/login', '/register', '/verify-email', '/verify-otp', '/unauthorized', '/install', '/hackathon',
    '/farmer', '/farmer/map', '/farmer/weather', '/farmer/disease', '/farmer/products', '/farmer/orders', '/farmer/schemes', '/farmer/equipment', '/farmer/trading', '/farmer/quality', '/farmer/profile', '/farmer/settings',
    '/veterinary', '/veterinary/settings', '/veterinary/consultations', '/veterinary/chat', '/veterinary/map', '/veterinary/profile',
    '/marketplace', '/marketplace/checkout', '/marketplace/orders', '/consumer/profile', '/consumer/settings',
    '/retailer', '/retailer/orders', '/retailer/inventory', '/retailer/partnerships', '/retailer/profile', '/retailer/settings',
    '/delivery', '/delivery/orders', '/delivery/profile', '/delivery/settings',
    '/admin', '/admin/users', '/admin/vets', '/admin/analytics', '/admin/profile', '/admin/settings',
    '/profile', '/settings',
  ];

  // Map known-broken or generic URLs onto real routes for the current role.
  const resolveUrl = (raw: unknown, metadata: Record<string, unknown> = {}): string | null => {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    let url = raw.trim();
    // Strip absolute origin if present
    try {
      if (/^https?:\/\//i.test(url)) {
        const u = new URL(url);
        if (typeof window !== 'undefined' && u.origin !== window.location.origin) return null; // external
        url = u.pathname + u.search + u.hash;
      }
    } catch { /* ignore */ }
    if (!url.startsWith('/')) url = '/' + url;

    const role = user?.role;
    const suggestionType = typeof metadata.type === 'string' ? metadata.type : undefined;
    const roleHome: Record<string, string> = {
      farmer: '/farmer', veterinary: '/veterinary', consumer: '/marketplace',
      retailer: '/retailer', delivery: '/delivery', admin: '/admin',
    };

    // Smart suggestions are generated globally, so map marketplace-style
    // recommendations to the closest allowed page for the current role.
    if (metadata.smart === true && role) {
      if (role === 'farmer' && (url === '/marketplace' || url.startsWith('/marketplace/'))) {
        if (suggestionType === 'product') return '/farmer/equipment';
        if (suggestionType === 'market') return '/farmer/trading';
        return '/farmer';
      }
      if (role === 'retailer' && (url === '/marketplace' || url.startsWith('/marketplace/'))) {
        return '/retailer/inventory';
      }
      if (role === 'delivery' && (url === '/marketplace' || url.startsWith('/marketplace/'))) {
        return '/delivery/orders';
      }
    }

    // Common normalizations
    const map: Record<string, string> = {
      '/farmer/dashboard': '/farmer',
      '/consumer/dashboard': '/marketplace',
      '/retailer/dashboard': '/retailer',
      '/delivery/dashboard': '/delivery',
      '/admin/dashboard': '/admin',
      '/veterinary/dashboard': '/veterinary',
      '/orders': role === 'consumer' ? '/marketplace/orders'
        : role === 'farmer' ? '/farmer/orders'
        : role === 'retailer' ? '/retailer/orders'
        : role === 'delivery' ? '/delivery/orders'
        : '/',
      '/dashboard': role ? roleHome[role] : '/',
      '/home': role ? roleHome[role] : '/',
      '/consumer/orders': '/marketplace/orders',
      '/consumer/marketplace': '/marketplace',
      '/orders/consumer': '/marketplace/orders',
      '/orders/seller': '/farmer/orders',
      '/products': role === 'farmer' ? '/farmer/products' : '/marketplace',
      '/market': '/marketplace',
      '/shop': '/marketplace',
      '/delivery/active': '/delivery/orders',
      '/notifications/settings': '/settings',
      '/unauthorized': role ? roleHome[role] : '/',
    };
    if (map[url]) return map[url];

    if (url.startsWith('/order/')) return `/track/${url.split('/').filter(Boolean).pop()}`;
    if (url.startsWith('/orders/')) return `/track/${url.split('/').filter(Boolean).pop()}`;
    if (url.startsWith('/track/')) return url;
    if (url.startsWith('/invoice/')) return url;

    const cleanPath = url.split('?')[0].split('#')[0];
    if (!appRoutes.includes(cleanPath)) {
      return role ? roleHome[role] : '/';
    }

    // Block role-restricted paths the current user cannot access — remap to their role home.
    // Shared routes that any authenticated user can visit.
    const sharedPrefixes = ['/profile', '/settings', '/track/', '/invoice/', '/verify-otp', '/verify-email', '/install', '/hackathon'];
    if (sharedPrefixes.some((p) => cleanPath === p || cleanPath.startsWith(p))) return url;

    // Role-allowed top-level prefixes (mirrors App.tsx ProtectedRoute config).
    const roleAllowedPrefixes: Record<string, string[]> = {
      farmer: ['/farmer', '/veterinary/map'],
      veterinary: ['/veterinary'],
      consumer: ['/marketplace', '/consumer'],
      retailer: ['/retailer'],
      delivery: ['/delivery'],
      admin: ['/admin'],
    };
    if (role) {
      const allowed = roleAllowedPrefixes[role] || [];
      const ok = allowed.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'));
      if (!ok) return roleHome[role];
    }
    return url;
  };

  const handleNotificationClick = (notificationId: string, data?: unknown) => {
    markAsRead(notificationId);

    // Track click for Smart Suggestions (feedback loop for the recommendation AI)
    const d = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {};
    if (d.smart === true && !DEMO_DATA_MODE) {
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data: u }) => {
          if (!u.user) return;
          supabase.from('suggestion_interactions').insert({
            user_id: u.user.id,
            notification_id: notificationId,
            suggestion_type: typeof d.type === 'string' ? d.type : 'general',
            title: typeof d.title === 'string' ? d.title : null,
            action: 'clicked',
            score: typeof d.score === 'number' ? d.score : null,
            url: typeof d.url === 'string' ? d.url : null,
          });
        });
      });
    }

    // Navigate (SPA) if URL is provided
    const target = resolveUrl(d.url, d);
    if (target) {
      setIsOpen(false);
      navigate(target);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  ← Back
                </Button>
                <span className="text-sm font-medium">Push Settings</span>
              </div>

              {!isSupported ? (
                <p className="text-sm text-muted-foreground">
                  Push notifications are not supported in your browser.
                </p>
              ) : permission === 'denied' ? (
                <p className="text-sm text-muted-foreground">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed
                      ? 'You are receiving push notifications.'
                      : 'Enable push notifications to get alerts even when the app is closed.'}
                  </p>
                  <Button
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={pushLoading}
                    variant={isSubscribed ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {pushLoading
                      ? 'Loading...'
                      : isSubscribed
                      ? 'Disable Notifications'
                      : 'Enable Notifications'}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <Bell className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => {
                      const Icon = notificationIcons[notification.notification_type] || Bell;
                      return (
                        <motion.button
                          key={notification.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleNotificationClick(notification.id, notification.data)}
                          className={cn(
                            'w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3',
                            !notification.is_read && 'bg-primary/5'
                          )}
                        >
                          <div className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                            !notification.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn(
                                'text-sm truncate',
                                !notification.is_read && 'font-medium'
                              )}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.body}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
