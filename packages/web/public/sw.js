/* Borsa — Service Worker for Web Push Notifications */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: 'Borsa', body: event.data.text() }; }

  const title   = payload.title  ?? 'Borsa';
  const options = {
    body:    payload.body    ?? '',
    icon:    payload.icon    ?? '/borsa-logo-96.webp',
    badge:   payload.badge   ?? '/borsa-logo-96.webp',
    tag:     payload.tag     ?? 'borsa',
    renotify: true,
    data:    { route: payload.route ?? '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(route);
          return client.focus();
        }
      }
      return self.clients.openWindow(route);
    }),
  );
});
