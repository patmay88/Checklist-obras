// Service worker: guarda la app en el móvil para que funcione sin cobertura.
// Al publicar una versión nueva, cambiar VERSION para que los móviles la descarguen.
const VERSION = 'checklist-v3';
const ARCHIVOS = ['./', 'index.html', 'app.js', 'plantillas.js', 'motor-docs.js', 'documentos.js', 'manifest.webmanifest',
  'img/icon-192.png', 'img/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la copia guardada (arranca al instante aunque no haya cobertura);
// si hay red, se descarga la versión nueva en segundo plano para la próxima vez.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const guardado = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return guardado || (await red) || (await c.match('index.html'));
  }));
});
