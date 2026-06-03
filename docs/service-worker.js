const CACHE_NAME = "alankon-gaming-v11-platform";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./2048",
  "./2048.html",
  "./aprender-teclas",
  "./aprender-teclas.html",
  "./manifest.webmanifest",
  "./static/menu.css",
  "./static/game.css",
  "./static/game.js",
  "./static/learn_keys.css",
  "./static/learn_keys.js",
  "./static/icons/alankon-gaming-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((asset) =>
          fetch(asset)
            .then((response) => {
              if (response.ok) return cache.put(asset, response);
              return null;
            })
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
