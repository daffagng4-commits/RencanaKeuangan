/**
 * Service Worker untuk Rencana Keuangan: offline cache & notifikasi lokal tagihan.
 */
const CACHE_NAME = 'rk-cache-v44';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './logo-lockup-light.svg',
  './logo-lockup-dark.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Listener untuk memicu Web Notification langsung dari Service Worker (bertahan di Laci Notifikasi & Lock Screen)
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'DUE_NOTIFICATION') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      tag: e.data.tag || 'rk-bill-notif',
      icon: './icon-192.png',
      badge: './icon-192.png',
      renotify: true,
      requireInteraction: true,
      vibrate: [180, 80, 180],
      data: { url: './?mode=app' }
    });
  }
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Supabase API & Google OAuth callback bypass cache agar sesi login tidak terganggu
  if (url.hostname.includes('supabase.co') || url.hostname.includes('accounts.google.com') || url.searchParams.has('code') || url.searchParams.has('error')) return;

  // Network-First untuk dokumen HTML agar pembaruan program selalu langsung muncul saat online
  const isHtml = e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'));
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || caches.match('./index.html') || caches.match('./')))
    );
    return;
  }

  // Cache-First dengan background revalidate untuk aset statis lain
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || caches.match(e.request, { ignoreSearch: true }));
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || './?mode=app';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
