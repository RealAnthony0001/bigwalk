// Offline: precache the app and the Prague map on first visit; app files stay fresh when online, the map is cache-first.
const C = 'bigwalk-v1', MAP = 'prague.pmtiles';
const FILES = ['./', 'index.html', 'walk.js', 'schema.js', 'stations.js', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/protomaps-leaflet.js', MAP];

oninstall = e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)));
onactivate = e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k != C).map(k => caches.delete(k)))));

onfetch = e => {
  const r = e.request, u = new URL(r.url);
  if (r.method != 'GET' || u.origin != location.origin) return;
  e.respondWith(u.pathname.endsWith(MAP) ? caches.match(r).then(x => x || fetch(r)) : fetch(r).then(x => { if (x.ok) caches.open(C).then(c => c.put(r, x.clone())); return x; }).catch(() => caches.match(r)));
};
