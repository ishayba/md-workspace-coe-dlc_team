const CACHE = 'md-workspace-offline-v4.5.0-build-20261022-01';
const ASSETS = [
  './',
  './index.html',
  './css-studio.js',
  './css-studio-ui.js',
  './md-visual.js',
  './md-visual-ui.js',
  './icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // v4.4: ספריית העיצובים של הפרויקט (/api/...) תמיד מהשרת — לעולם לא מה-cache, כדי שהרשימה לא תהיה מיושנת
  if (new URL(e.request.url).pathname.startsWith('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
