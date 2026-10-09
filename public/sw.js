/*
 * BrightonSolution service worker.
 *
 * Purpose: keep the site readable when the network or the server misbehaves.
 *  - Navigations: network first (4s), then the cached copy of that page, then /offline.
 *  - Hashed build assets (/_next/static/*): cache first.
 *  - Images, icons, fonts (/work/sites/*, /work/apps/*, .svg, .webp, .png, .woff2): stale-while-revalidate.
 *  - Never touches cross-origin requests (Firestore, Google), /admin, non-GET, or ?no-sw.
 *
 * Safety: every handler falls back to a plain network fetch on any error, so a bug
 * here can never make the site worse than having no service worker.
 *
 * Kill switch: set KILL = true and deploy. Each visitor's worker then deletes its
 * caches, unregisters itself and stops intercepting requests.
 * Bump VERSION when changing this file's caching behaviour; old caches are removed.
 */

const KILL = false;
const VERSION = "2026-10-09.2";
const CACHE = "bs-v" + VERSION;
const OFFLINE_URL = "/offline";
const PRECACHE = ["/offline", "/", "/services", "/work", "/about", "/contact", "/icon.svg"];
const NAV_TIMEOUT_MS = 4000;
const MAX_ENTRIES = 220;

/* ---------- lifecycle ---------- */

self.addEventListener("install", (event) => {
  self.skipWaiting();
  if (KILL) return;
  event.waitUntil(precache().catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(
          keys.filter((key) => key.startsWith("bs-") && (KILL || key !== CACHE)).map((key) => caches.delete(key)),
        );
        if (KILL) {
          await self.registration.unregister();
          return;
        }
        await self.clients.claim();
      } catch (_) {
        /* ignore */
      }
    })(),
  );
});

/* ---------- precache ---------- */

function isCacheable(response) {
  return Boolean(response && response.ok && response.type === "basic" && !response.redirected);
}

async function precache() {
  const cache = await caches.open(CACHE);
  const assets = new Set();

  await Promise.allSettled(
    PRECACHE.map(async (url) => {
      const response = await fetch(new Request(url, { cache: "reload", credentials: "same-origin" }));
      if (!isCacheable(response)) return;
      const type = response.headers.get("content-type") || "";
      if (type.includes("text/html")) {
        // Collect the CSS/JS the page needs so cached pages render fully offline.
        const html = await response.clone().text();
        const re = /(?:href|src)="(\/_next\/static\/[^"?#]+)"/g;
        let match;
        while ((match = re.exec(html)) !== null) assets.add(match[1]);
      }
      await cache.put(url, response);
    }),
  );

  await Promise.allSettled(
    Array.from(assets).map(async (url) => {
      if (await cache.match(url)) return;
      const response = await fetch(url, { credentials: "same-origin" });
      if (isCacheable(response)) await cache.put(url, response);
    }),
  );
}

async function trim(cache) {
  try {
    const keys = await cache.keys();
    const excess = keys.length - MAX_ENTRIES;
    if (excess <= 0) return;
    const protectedPaths = new Set(PRECACHE);
    let removed = 0;
    for (const request of keys) {
      if (removed >= excess) break;
      const path = new URL(request.url).pathname;
      if (protectedPaths.has(path)) continue;
      await cache.delete(request);
      removed += 1;
    }
  } catch (_) {
    /* ignore */
  }
}

async function store(request, response) {
  try {
    if (!isCacheable(response)) return;
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
    await trim(cache);
  } catch (_) {
    /* ignore (quota, opaque, etc.) */
  }
}

/* ---------- strategies ---------- */

function timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

function offlineFallback() {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Offline - BrightonSolution</title></head>' +
      '<body style="margin:0;background:#FAFAF7;color:#0A1220;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
      '<main style="max-width:680px;margin:0 auto;padding:clamp(48px,10vw,120px) 20px">' +
      '<p style="margin:0;font-size:15px;font-weight:600">BrightonSolution</p>' +
      '<h1 style="margin:32px 0 0;font-size:clamp(28px,4vw + 12px,44px);line-height:1.08;font-weight:600;letter-spacing:-0.03em">You appear to be offline</h1>' +
      '<p style="margin:20px 0 0;font-size:17px;line-height:1.55;color:#5B6170">We could not reach the network. Please check your connection and try again.</p>' +
      '<p style="margin:32px 0 0"><a href="" style="display:inline-flex;align-items:center;min-height:44px;padding:0 24px;background:#0A1220;color:#FAFAF7;text-decoration:none;font-weight:600;border-radius:2px">Retry</a></p>' +
      '<p style="margin:40px 0 0;font-size:15px;color:#5B6170">Email <a href="mailto:support@brightonsolution.com" style="color:#0A1220">support@brightonsolution.com</a></p>' +
      "</main></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function cachedPage(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
  return (
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match(path)) ||
    (await cache.match(path + ".html")) ||
    null
  );
}

async function fallbackFor(request) {
  try {
    const page = await cachedPage(request);
    if (page) return page;
    const cache = await caches.open(CACHE);
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
  } catch (_) {
    /* ignore */
  }
  return offlineFallback();
}

async function handleNavigation(event) {
  const { request } = event;
  const network = fetch(request).then(
    (response) => {
      try {
        if (isCacheable(response)) {
          const copy = response.clone();
          event.waitUntil(store(new URL(request.url).pathname, copy));
        }
      } catch (_) {
        /* ignore */
      }
      return response;
    },
    () => null,
  );

  // Give the network NAV_TIMEOUT_MS; if it is slow and we have a cached copy, use it.
  const first = await Promise.race([network, timeout(NAV_TIMEOUT_MS)]);
  if (first) {
    // Server errors (5xx): prefer a known-good cached copy if there is one.
    if (first.status >= 500) {
      const cached = await cachedPage(request).catch(() => null);
      return cached || first;
    }
    return first;
  }

  const cached = await cachedPage(request).catch(() => null);
  if (cached) return cached;

  const late = await network;
  if (late) return late;
  return fallbackFor(request);
}

async function cacheFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (isCacheable(response)) event.waitUntil(store(request, response.clone()));
  return response;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (isCacheable(response)) return store(request, response.clone()).then(() => response);
      return response;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  const response = await refresh;
  return response || Response.error();
}

/* ---------- routing ---------- */

function isStaticAsset(url) {
  return (
    /^\/work\/(?:sites|apps)\//.test(url.pathname) ||
    /\.(?:woff2|svg|webp|png|ico)$/i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  if (KILL) return;

  let url;
  try {
    const { request } = event;
    if (request.method !== "GET") return;
    if (request.headers.has("range")) return;
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
    url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname === "/sw.js" || url.pathname.startsWith("/admin")) return;
    if (url.searchParams.has("no-sw")) return;
  } catch (_) {
    return;
  }

  const { request } = event;
  const safe = (promise) => promise.catch(() => fetch(request));

  try {
    if (request.mode === "navigate") {
      event.respondWith(
        handleNavigation(event).catch(() => fetch(request).catch(() => fallbackFor(request))),
      );
      return;
    }
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(safe(cacheFirst(event)));
      return;
    }
    if (isStaticAsset(url)) {
      event.respondWith(safe(staleWhileRevalidate(event)));
    }
    // Everything else (RSC payloads, robots, sitemap, ...) goes straight to the network.
  } catch (_) {
    /* fall through to the browser's default network handling */
  }
});
