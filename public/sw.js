// Service Worker для PWA функциональности
const CACHE_NAME = 'epc-poker-v1.0.5';
const STATIC_ASSETS = [
  '/',
  '/telegram',
  '/manifest.json',
  '/lovable-uploads/3d3f89dd-02a1-4e23-845c-641c0ee0956b.png',
  '/lovable-uploads/84d7799c-d9ab-4819-8831-7e2ba28051e8.png'
];

// Установка SW
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Installation completed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Installation failed:', error);
      })
  );
});

// Активация SW
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Activation completed');
        return self.clients.claim();
      })
  );
});

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') {
    return;
  }

  // Пропускаем запросы к Supabase
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Пропускаем запросы к внешним API
  if (event.request.url.includes('api.') || event.request.url.includes('cdn.')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем из кэша если есть
        if (response) {
          console.log('SW: Serving from cache:', event.request.url);
          return response;
        }

        // Иначе делаем сетевой запрос
        console.log('SW: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Проверяем валидность ответа
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ для кэширования
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('SW: Fetch failed:', error);
            
            // Fallback для HTML страниц
            if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/telegram') || caches.match('/');
            }
            
            throw error;
          });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('SW: Script loaded successfully');