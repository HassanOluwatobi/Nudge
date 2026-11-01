// Shrink my day service worker: network first, fall back to cache so the app opens offline.
const CACHE = "nudgeme-v27-1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/app", "/", "/manifest.webmanifest", "/icon-192.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/app")))
  );
});
// A reminder sent by the Shrink my day reminder sender. The phone sealed it, the push service opened it here.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (err) {
    d = { title: "Shrink my day", body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Shrink my day", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: d.tag || undefined,
      data: { url: d.url || "/app" },
    })
  );
});
// Tapping a Shrink my day notification opens the app.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/app";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const c = cs.find((x) => "focus" in x);
      if (c) return c.focus().then((w) => (w && "navigate" in w && url !== "/app" ? w.navigate(url) : w));
      return self.clients.openWindow(url);
    })
  );
});
