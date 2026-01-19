const CACHE_NAME = 'fcmargonda-v2-stable'; // Ganti v3, v4 jika ada update besar
const urlsToCache = [
  './',
  './index.html',      // Pastikan index terdaftar
  './manifest.json',
  './logo.png'
  // './admin.html'    // Opsional: Boleh dimatikan saat dev biar gak pusing
];

// 1. INSTALL: Cache halaman static (App Shell)
self.addEventListener('install', event => {
  console.log('[SW] Install & Cache resources');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Paksa SW baru aktif segera
  );
});

// 2. ACTIVATE: Hapus Cache Lama (PENTING UNTUK FIX BLANK)
self.addEventListener('activate', event => {
  console.log('[SW] Activate & Clean old cache');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Delete old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Strategi "Network First, Fallback to Cache"
self.addEventListener('fetch', event => {
  // A. Jangan ganggu request ke Firebase/Google Fonts/API External
  // Biarkan browser menanganinya secara normal agar data realtime aman
  if (event.request.url.includes('firestore') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return; 
  }

  // B. Untuk file aplikasi kita (HTML, CSS, JS Local)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 1. Jika ada internet, ambil file baru & simpan ke cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // 2. Jika OFFLINE, baru ambil dari cache
        console.log('[SW] Offline, serving cache for:', event.request.url);
        return caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Jika offline & file tidak ada di cache (misal halaman baru)
                // Bisa return halaman offline custom jika mau
            });
      })
  );
});
