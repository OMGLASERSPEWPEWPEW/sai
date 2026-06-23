const CACHE_NAME = 'mindshare-v1';
const APP_SHELL = ['/', '/index.html'];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// Activate: purge any old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first for API / Supabase, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for Supabase and API calls
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful GET responses
          if (request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful GET responses for static assets
        if (request.method === 'GET' && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});

// Push: display notifications from the server
self.addEventListener('push', (event) => {
  let data = { title: 'Mindshare', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Mindshare', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-72.png',
      data: data.url ? { url: data.url } : undefined,
    }),
  );
});

// Notification click: open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing tab if one matches
        for (const client of clients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl);
      }),
  );
});
