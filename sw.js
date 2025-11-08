// Минимальный Service Worker чтобы PWA не падала с 404
const CACHE_NAME = '3d-viewer-minimal-v1';

self.addEventListener('install', (event) => {
    console.log('🛠️ Service Worker: установлен (минимальная версия)');
    // Немедленно активируем новый SW
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🛠️ Service Worker: активирован');
    // Немедленно берем контроль над клиентами
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Всегда используем сеть, не кэшируем
    event.respondWith(fetch(event.request));
});
