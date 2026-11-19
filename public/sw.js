importScripts("/precache-manifest.js");
const CACHE = "mam-nho-next-" + (self.__BUILD || "development");
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll([
          "/",
          "/icon-192.png",
          "/manifest.webmanifest",
          ...(self.__PRECACHE || []),
        ]),
      ),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("mam-nho-") && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/@")
  )
    return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return r;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|woff2|webmanifest)$/.test(url.pathname)
  )
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return r;
          }),
      ),
    );
});
self.addEventListener("push", (event) => {
  let data = {
    title: "Mầm Nhỏ",
    body: "Có hoạt động mới trong lớp của em.",
    url: "/",
  };
  try {
    Object.assign(data, event.data?.json());
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.url,
      data: { url: data.url },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = new URL(event.notification.data?.url || "/", self.location.origin);
  if (url.origin !== self.location.origin)
    url = new URL("/", self.location.origin);
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const client = windows.find(
          (c) => new URL(c.url).origin === url.origin,
        );
        if (client) {
          await client.navigate(url.href);
          return client.focus();
        }
        return clients.openWindow(url.href);
      }),
  );
});
