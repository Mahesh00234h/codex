// Service Worker for Push Notifications and Background Sync

const CACHE_NAME = 'farmaline-v2';
const OFFLINE_URL = '/';

function normalizeAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, self.location.origin);
    const map = {
      '/farmer/dashboard': '/farmer',
      '/farmer/market': '/farmer/trading',
      '/farmer/marketplace': '/farmer/trading',
      '/consumer/dashboard': '/marketplace',
      '/consumer/orders': '/marketplace/orders',
      '/retailer/dashboard': '/retailer',
      '/delivery/dashboard': '/delivery',
      '/admin/dashboard': '/admin',
      '/veterinary/dashboard': '/veterinary',
    };
    return url.origin + (map[url.pathname] || url.pathname) + url.search + url.hash;
  } catch {
    return self.location.origin + '/';
  }
}

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Background Sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // This will be handled by the app's syncService when it comes online
  // The service worker just triggers the sync event
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  allClients.forEach((client) => {
    client.postMessage({ type: 'SYNC_OFFLINE_DATA' });
  });
}

// Fetch handler with offline support
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  // Never cache app page navigations. Old cached 404 pages can otherwise keep
  // showing after new React routes are added.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const offlinePage = await caches.match(OFFLINE_URL);
        return offlinePage || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();
        
        // Cache successful responses for static assets
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            // Only cache same-origin static assets, not HTML/page navigations
            const requestUrl = new URL(event.request.url);
            if (requestUrl.origin === self.location.origin && event.request.destination !== 'document') {
              cache.put(event.request, responseClone);
            }
          });
        }
        
        return response;
      })
      .catch(async () => {
        // Try to get from cache when offline
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // For navigation requests, return the offline page
        if (event.request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
        }
        
        // Return a basic offline response for other requests
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});

self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  let data = {
    title: 'Farmaline',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'default'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = normalizeAppUrl(event.notification.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (event.notification.data?.url) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  console.log('Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'REGISTER_SYNC') {
    // Register background sync
    if ('sync' in self.registration) {
      self.registration.sync.register('sync-offline-data').catch((err) => {
        console.log('Background sync registration failed:', err);
      });
    }
  }
});
