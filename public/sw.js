// Service Worker для PWA функциональности
const CACHE_NAME = 'epc-poker-v1';
const urlsToCache = [
  '/',
  '/telegram',
  '/manifest.json',
  '/lovable-uploads/3d3f89dd-02a1-4e23-845c-641c0ee0956b.png',
  '/lovable-uploads/84d7799c-d9ab-4819-8831-7e2ba28051e8.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Кэширование файлов');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Ошибка кэширования', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Удаление старого кэша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  // Только для GET запросов
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кэшированную версию или запрашиваем из сети
        return response || fetch(event.request)
          .then((response) => {
            // Проверяем, что получили корректный ответ
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
          .catch(() => {
            // В случае ошибки возвращаем кэшированную страницу
            return caches.match('/telegram');
          });
      })
  );
});