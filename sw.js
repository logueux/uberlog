// UBERLOG : cache hors réseau. Changer VERSION à chaque mise en ligne.
const VERSION = "uberlog-v14";
const COQUILLE = ["./", "./index.html", "./manifest.webmanifest", "./icones/icone-192.png", "./icones/icone-512.png", "./icones/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Firestore gère lui-même son hors-ligne : ne pas s'en mêler
  if (url.hostname.endsWith("googleapis.com") && !url.hostname.startsWith("fonts.")) return;
  if (req.mode === "navigate") {
    // Page : réseau d'abord (mises à jour immédiates), cache si hors réseau
    e.respondWith(fetch(req).then(r => { const copie = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copie)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Scripts, polices, icônes : cache d'abord, puis réseau
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const copie = r.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
    return r;
  })));
});

// Toucher une notification ramène sur l'appli
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
