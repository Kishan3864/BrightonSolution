/*
 * BrightonSolution Admin service worker (admin.brightonsolution.com only; copied into out-admin/ by
 * scripts/build-admin-site.mjs). The website keeps its own worker (public/sw.js).
 *
 *  - push: shows the alert sent by functions/index.js (wording: components/admin/data/notify.ts).
 *  - notificationclick: brings the open app forward and shows that enquiry (message "bs-admin-open",
 *    handled in components/admin/shell/AdminApp.tsx), or opens the app at it; the "whatsapp" action
 *    opens WhatsApp with the enquiry's number.
 *  - fetch: the app shell is network first with a cached copy for offline starts; hashed build files
 *    (/_next/static/*) are cache first. Firestore and Google requests (other origins) and anything that
 *    is not a GET are never touched. Enquiry data is never cached.
 *
 * Bump VERSION when changing caching behaviour; old caches are removed on activate.
 */

const VERSION = "2026-10-28.1";
const CACHE = "bs-admin-" + VERSION;
const SHELL = "/";
const MAX_ENTRIES = 160;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(SHELL, { cache: "reload" })))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(keys.filter((key) => key.startsWith("bs-admin-") && key !== CACHE).map((key) => caches.delete(key)));
      } catch (_) {
        /* ignore */
      }
      await self.clients.claim();
    })(),
  );
});

/* ---------- fetch ---------- */

async function trim(cache) {
  try {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_ENTRIES; i += 1) await cache.delete(keys[i]);
  } catch (_) {
    /* ignore */
  }
}

async function shell(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE);
      await cache.put(SHELL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(SHELL);
    if (cached) return cached;
    throw error;
  }
}

async function staticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
    void trim(cache);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(shell(request).catch(() => fetch(request)));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staticAsset(request).catch(() => fetch(request)));
  }
});

/* ---------- push ---------- */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "New enquiry", body: event.data ? event.data.text() : "" };
  }
  const data = payload.data && typeof payload.data === "object" ? payload.data : { url: "#/overview" };
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/badge-96.png",
    timestamp: typeof payload.timestamp === "number" ? payload.timestamp : Date.now(),
    data,
    // The open admin may already have shown this enquiry (same tag): replace it quietly.
    renotify: false,
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : [],
  };
  if (payload.tag) options.tag = payload.tag;
  event.waitUntil(
    self.registration.showNotification(typeof payload.title === "string" && payload.title ? payload.title : "New enquiry", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  notification.close();

  if (event.action === "whatsapp" && typeof data.whatsapp === "string" && data.whatsapp.startsWith("https://wa.me/")) {
    event.waitUntil(self.clients.openWindow(data.whatsapp));
    return;
  }

  const hash = typeof data.url === "string" && data.url.startsWith("#/") ? data.url : "#/overview";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          client.postMessage({ type: "bs-admin-open", url: hash });
          await client.focus();
          return;
        } catch (_) {
          /* try the next window, or open a new one */
        }
      }
      await self.clients.openWindow(new URL("/" + hash, self.location.origin).href);
    })(),
  );
});
