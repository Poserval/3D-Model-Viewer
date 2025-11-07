const CACHE_NAME = '3d-viewer-v1.5';
const urlsToCache = [
    '/',
    '/index.html',
    '/404.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icons/icon-app-192.png',
    '/icons/icon-app-512.png',
    '/icons/logo-header.png'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем кэш или делаем запрос
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then((response) => {
                    // Если страница не найдена (404), возвращаем главную страницу
                    if (response.status === 404) {
                        return caches.match('/index.html');
                    }
                    
                    // Проверяем валидный ли ответ
                    if(!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Клонируем ответ
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch((error) => {
                    // Если ошибка сети, возвращаем главную страницу
                    console.log('Fetch failed; returning offline page instead.', error);
                    return caches.match('/index.html');
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
