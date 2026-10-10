const CACHE_NAME = 'consultei-offline-v1';
const APP_URLS = ['./', './index.html'];
const PDF_LIBRARIES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_URLS);
    await Promise.all(PDF_LIBRARIES.map(async url => {
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn('Biblioteca PDF não foi armazenada para uso offline', error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes
      .filter(nome => nome.startsWith('consultei-offline-') && nome !== CACHE_NAME)
      .map(nome => caches.delete(nome)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && new URL(request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        return caches.match(new URL('./index.html', self.location.href).href);
      }
      throw error;
    }
  })());
});