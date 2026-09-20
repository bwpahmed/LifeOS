/* LifeOS service worker.
   Privacy rule: never cache authenticated HTML/API responses. Only public shell/static assets. */
const CACHE = "lifeos-v4";
const CORE = ["/offline.html", "/manifest.webmanifest", "/icons/icon.svg", "/today", "/tasks", "/habits", "/quick-add", "/mobile", "/sticky-notes", "/expenses", "/health-planner"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || caches.match("/offline.html")));
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest";

  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "LifeOS", body: "Reminder", url: "/today" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}
  const targetUrl = data.url || data.data?.url || "/today";
  event.waitUntil(
    self.registration.showNotification(data.title || "LifeOS", {
      body: data.body || "A LifeOS item needs attention.",
      icon: data.icon || "/icons/icon.svg",
      badge: data.badge || "/icons/icon.svg",
      tag: data.tag || "lifeos",
      requireInteraction: Boolean(data.requireInteraction),
      data: { ...(data.data || {}), url: targetUrl },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/today";
  event.waitUntil(clients.openWindow(url));
});
