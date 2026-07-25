/* Catalonia 2026 offline cache */
var VERSION = 'cat26-v12';
var CORE = [".", "favicon.ico", "assets/trip-kit.css", "assets/trip-kit.js", "assets/you.css", "assets/trip-data.js", "assets/you.js", "assets/aiguablava-hotel.jpg", "assets/aiguablava.jpg", "assets/banyoles.jpg", "assets/begur.jpg", "assets/bella-lola.jpg", "assets/calella-port-bo.jpg", "assets/camping-cabin.jpg", "assets/camping-gym.jpg", "assets/camping-porch.jpg", "assets/campsite-pool.jpg", "assets/cap-roig.jpg", "assets/castell.jpg", "assets/clara-begur.jpg", "assets/el-far.jpg", "assets/falset-vines.jpg", "assets/girona.jpg", "assets/illes-medes.jpg", "assets/la-bisbal.jpg", "assets/lily-aiguablava.jpg", "assets/lily-caproig.jpg", "assets/llafranc-bay.jpg", "assets/llafranc-evening.jpg", "assets/llafranc-front-row.jpg", "assets/llafranc.jpg", "assets/lounge-bcn.jpg", "assets/lounge-lhr.jpg", "assets/magma.jpg", "assets/mas-de-torrent.jpg", "assets/pa-i-raim.jpg", "assets/pallissa-dining.jpg", "assets/pallissa-living.jpg", "assets/pals-old-town.jpg", "assets/peratallada.jpg", "assets/platja-de-pals.jpg", "assets/sa-riera.jpg", "assets/tamariu.jpg", "assets/toc-al-mar.jpg", "assets/tragamar.jpg", "assets/leaflet/leaflet.css", "assets/leaflet/leaflet.js", "assets/fonts/25040cb42f.woff2", "assets/fonts/28d80079bb.woff2", "assets/fonts/2983b8a896.woff2", "assets/fonts/2bebd3cbd4.woff2", "assets/fonts/48072044ec.woff2", "assets/fonts/7963a16ee5.woff2", "assets/fonts/80724b1ffd.woff2", "assets/fonts/880eabe202.woff2", "assets/fonts/8f41327977.woff2", "assets/fonts/9e5095030b.woff2", "assets/fonts/a7d31096e7.woff2", "assets/fonts/a80b2cab5e.woff2", "assets/fonts/ac5feb9532.woff2", "assets/fonts/bbbd9b1202.woff2", "assets/fonts/bc87d8e058.woff2", "assets/fonts/ed6f8e8580.woff2"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; /* live feeds and map tiles stay network-only */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('.'); }); }));
    return;
  }
  /* Code changes; photographs and fonts do not. Serving code cache-first meant a
     new build was invisible until the page had been loaded twice. Code now comes
     from the network when there is one, and falls back to the cache when there
     is not, so the page still works on the plane. */
  if (/\.(?:js|css)$/i.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true });
    }));
    return;
  }

  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (m) {
    return m || fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
      return res;
    });
  }));
});
