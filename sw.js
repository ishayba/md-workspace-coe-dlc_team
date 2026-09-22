const CACHE = 'md-workspace-offline-v0.3.9-build-20260906-01';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg', './README.md', './MVP_SPEC.md'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(resp => {
    const clone = resp.clone(); caches.open(CACHE).then(cache => cache.put(event.request, clone)); return resp;
  }).catch(() => caches.match('./index.html'))));
});

self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
