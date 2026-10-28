"use client";

import { useSyncExternalStore } from "react";

/**
 * Hash router for the admin app. Routes live after "#/" so they work unchanged wherever the page is
 * served (/admin today, the root of admin.brightonsolution.com later) and in a static export.
 *
 *   #/overview                         home (default)
 *   #/contacts            #/contacts/<id>        website contact-form submissions (+ detail)
 *   #/landing             #/landing/<id>         /start-project leads (+ detail)
 *   #/analytics/<tab>                            tabs: overview acquisition pages audience behaviour sessions speed
 *   #/analytics/sessions/<sessionId>             session detail
 *   #/analytics/visitors/<visitorId>             visitor journey (inside the sessions tab)
 *   #/settings
 *
 * Hashes that do not start with "#/" (e.g. the layout's "#main" skip link) are ignored: the current
 * route stays. Back/forward work through the browser history; goBack() closes a detail view by going
 * back when the previous entry was in the app, else by replacing the entry with the list route.
 */

export const ANALYTICS_TABS = ["overview", "acquisition", "pages", "audience", "behaviour", "sessions", "speed"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export type Route =
  | { view: "overview" }
  | { view: "contacts"; id?: string }
  | { view: "landing"; id?: string }
  | { view: "analytics"; tab: AnalyticsTab; sessionId?: string; visitorId?: string }
  | { view: "settings" };

export type ViewKey = Route["view"];

export const DEFAULT_ROUTE: Route = { view: "overview" };

function clean(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  try {
    const value = decodeURIComponent(segment).trim();
    return value && value.length <= 200 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Parses "#/landing/abc" -> { view: "landing", id: "abc" }. null when the hash is not an app route. */
export function parseHash(hash: string): Route | null {
  if (!hash || hash === "#" || hash === "#/") return DEFAULT_ROUTE;
  if (!hash.startsWith("#/")) return null;
  const [view, a, b] = hash.slice(2).split("?")[0].split("/");
  switch (view) {
    case "":
    case "overview":
      return { view: "overview" };
    case "contacts":
      return { view: "contacts", id: clean(a) };
    case "landing":
      return { view: "landing", id: clean(a) };
    case "settings":
      return { view: "settings" };
    case "analytics": {
      if (a === "visitors") return { view: "analytics", tab: "sessions", visitorId: clean(b) };
      const tab = (ANALYTICS_TABS as readonly string[]).includes(a ?? "") ? (a as AnalyticsTab) : "overview";
      return tab === "sessions" ? { view: "analytics", tab, sessionId: clean(b) } : { view: "analytics", tab };
    }
    default:
      return DEFAULT_ROUTE;
  }
}

/** Route -> "#/..." */
export function hrefFor(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.view) {
    case "overview":
      return "#/overview";
    case "contacts":
      return route.id ? `#/contacts/${enc(route.id)}` : "#/contacts";
    case "landing":
      return route.id ? `#/landing/${enc(route.id)}` : "#/landing";
    case "settings":
      return "#/settings";
    case "analytics":
      if (route.visitorId) return `#/analytics/visitors/${enc(route.visitorId)}`;
      if (route.tab === "sessions" && route.sessionId) return `#/analytics/sessions/${enc(route.sessionId)}`;
      return `#/analytics/${route.tab}`;
  }
}

/** Shorthand link builders for views. */
export const routes = {
  overview: () => "#/overview",
  contacts: (id?: string) => hrefFor({ view: "contacts", id }),
  landing: (id?: string) => hrefFor({ view: "landing", id }),
  analytics: (tab: AnalyticsTab = "overview") => hrefFor({ view: "analytics", tab }),
  session: (sessionId: string) => hrefFor({ view: "analytics", tab: "sessions", sessionId }),
  visitor: (visitorId: string) => hrefFor({ view: "analytics", tab: "sessions", visitorId }),
  settings: () => "#/settings",
};

/* ------------------------------------------------------------------ store */

let current: Route = DEFAULT_ROUTE;
let currentHash = "";
/** Hashes of app entries in visiting order, to tell a back step from a new navigation. */
const stack: string[] = [];
const listeners = new Set<() => void>();
let installed = false;

function sync() {
  const hash = window.location.hash;
  const parsed = parseHash(hash);
  if (!parsed) return; // not an app route: keep the current one
  const href = hrefFor(parsed);
  if (stack.length >= 2 && stack[stack.length - 2] === href) stack.pop();
  else if (stack[stack.length - 1] !== href) stack.push(href);
  if (stack.length > 100) stack.splice(0, stack.length - 100);
  if (href === currentHash) return;
  currentHash = href;
  current = parsed;
  listeners.forEach((fn) => fn());
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  sync();
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
}

function subscribe(fn: () => void) {
  install();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot(): Route {
  install();
  return current;
}

/** Current route; re-renders on every hash change. Server render returns the default route. */
export function useHashRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_ROUTE);
}

/** Go to a route or "#/..." href. `replace` swaps the current history entry instead of adding one. */
export function navigate(to: Route | string, options: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const href = typeof to === "string" ? to : hrefFor(to);
  if (!href.startsWith("#/")) return;
  if (options.replace) {
    const url = `${window.location.pathname}${window.location.search}${href}`;
    window.history.replaceState(window.history.state, "", url);
    if (stack.length) stack[stack.length - 1] = hrefFor(parseHash(href) ?? DEFAULT_ROUTE);
    sync();
    return;
  }
  if (window.location.hash === href) return;
  window.location.hash = href;
}

/**
 * Leave a detail view: history.back() when the previous entry is `fallback` (so Back/forward stay
 * natural), otherwise replace this entry with `fallback` (deep link opened from a notification).
 */
export function goBack(fallback: Route | string) {
  if (typeof window === "undefined") return;
  const href = typeof fallback === "string" ? fallback : hrefFor(fallback);
  if (stack.length >= 2 && stack[stack.length - 2] === hrefFor(parseHash(href) ?? DEFAULT_ROUTE)) {
    window.history.back();
    return;
  }
  navigate(href, { replace: true });
}
