const CACHE_NAME = 'datdhub-v3'; // bumped so browsers treat this as a fresh worker

const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/dashboard.css',
  '/assets/crest.png',
  '/js/supabase.js',
  '/js/dashboard.js'
  // '/js/common.js' removed — this file no longer exists, and its 404
  // was causing cache.addAll() to fail, which failed the install step,
  // which meant the service worker never activated, which meant
  // navigator.serviceWorker.ready hung forever on the client.
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache files individually and log failures instead of failing
      // the whole install if one URL is missing/renamed in the future.
      return Promise.all(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.error('SW: failed to cache', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch – only cache GET requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Supabase and external API calls
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached version if available
      if (cached) {
        return cached;
      }

      // Otherwise fetch from network and cache it
      return fetch(event.request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'DA United',
    body: 'New update from the club',
    url: '/dashboard.html'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {}

  const options = {
    body: data.body,
    icon: '/assets/crest.png',
    badge: '/assets/crest.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'DA United', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard.html')
  );
});
