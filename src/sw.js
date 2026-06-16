import { precacheAndRoute } from 'workbox-precaching';

// VERSION: 1.0.9 - Auto-Update On Deploy
// Injected manifest by VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);

const CACHE_NAME = 'walksafe-v1';
const APP_ICON = 'https://cdn-icons-png.flaticon.com/512/1048/1048329.png';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients so the page runs under the new SW immediately
  event.waitUntil(
    clients.claim().then(() => {
      // Notify all open windows that a new version is available
      return self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'SW_UPDATED' });
        }
      });
    })
  );
});

// System-wide background & closed-app push notification logic
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received:', event);
  let payload = { 
    title: "WalkSafe Compliance Notice", 
    body: "A new fleet safety broadcast alert has been triggered."
  };
  
  if (event.data) {
    try {
      const json = event.data.json();
      console.log('[Service Worker] Push Payload (JSON):', json);
      // Data-only payloads usually come as the root object or inside 'data'
      const info = json.data || json;
      payload.title = info.title || payload.title;
      payload.body = info.body || info.message || payload.body;
    } catch (e) {
      const text = event.data.text();
      try {
        const parsed = JSON.parse(text);
        const info = parsed.data || parsed;
        payload.title = info.title || payload.title;
        payload.body = info.body || info.message || payload.body;
      } catch (e2) {
        payload.body = text;
      }
    }
  }

  const options = {
    body: payload.body,
    icon: APP_ICON,
    badge: APP_ICON,
    vibrate: [150, 75, 150],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open Workspace' }
    ],
    tag: 'walksafe-broadcast',
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, options).catch(err => {
        console.error("[SW] Notification show failed:", err);
      }),
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ 
            type: 'PUSH_RECEIVED', 
            payload: {
              title: payload.title,
              body: payload.body
            } 
          });
        }
      })
    ])
  );
});

// On notification click, automatically focus or open the workspace dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(clickAction) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
