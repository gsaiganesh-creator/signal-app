// SIGNAL Service Worker — handles web push notifications

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: 'SIGNAL', body: e.data.text() }; }

  const options = {
    body:    payload.body   ?? '',
    icon:    payload.icon   ?? '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    data:    { url: payload.url ?? '/dashboard' },
    actions: payload.actions ?? [],
    tag:     payload.tag    ?? 'signal-alert',
    renotify: true,
  };

  e.waitUntil(self.registration.showNotification(payload.title ?? 'SIGNAL Alert', options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/dashboard';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) { existing.focus(); existing.navigate?.(url); }
      else self.clients.openWindow(url);
    })
  );
});
