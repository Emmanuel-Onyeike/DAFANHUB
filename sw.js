const CACHE_NAME = 'datdhub-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/dashboard.css',
  '/assets/crest.png',

  '/js/supabase.js',
  '/js/dashboard.js'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
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
