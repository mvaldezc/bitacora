/* Bitácora de entrenamiento — funcionamiento sin conexión.
   Sube el número de VERSION cada vez que cambies index.html para forzar la actualización. */
const VERSION = "bitacora-v1";
const NUCLEO = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icono-180.png",
  "./icono-192.png",
  "./icono-512.png"
];

/* Instalación: guarda los archivos propios de la app. */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(NUCLEO))
      .then(() => self.skipWaiting())
  );
});

/* Activación: borra las versiones viejas del caché. */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const mismoOrigen = new URL(req.url).origin === self.location.origin;

  if (mismoOrigen) {
    /* La app: primero la red para tener siempre la última versión,
       y si no hay señal, la copia guardada. */
    e.respondWith(
      fetch(req)
        .then(r => {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
          return r;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* Tipografías de Google: primero el caché, porque no cambian nunca. */
  e.respondWith(
    caches.match(req).then(guardada => {
      if (guardada) return guardada;
      return fetch(req).then(r => {
        if (r && (r.ok || r.type === "opaque")) {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => guardada);
    })
  );
});
