/**
 * When first-party analytics (and optional GA4) may run.
 *
 * Tracking is OFF when any of these is true:
 * - NEXT_PUBLIC_ANALYTICS_DISABLED === "true" (build-time switch)
 * - the page is served from localhost / 127.0.0.1 / ::1 / 0.0.0.0, or not over http(s)
 * - the visitor sends Global Privacy Control (navigator.globalPrivacyControl === true)
 * - the browser is automated or a known crawler (navigator.webdriver, bot user agents)
 * - the browser is marked as one of the team's own (localStorage "bs_internal" = "1"; set from the
 *   admin on this address, or by opening any page with ?bs_internal=on, see applyInternalParam)
 * - the route is /admin or the page runs on the admin site (the dashboard never measures itself)
 */

import { ADMIN_HOSTS } from "@/lib/site";

const BUILD_DISABLED = process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "true";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|phantom|puppeteer|playwright|selenium/i;

/** localStorage key that marks one of the team's own browsers ("1"); its visits are never recorded. */
export const INTERNAL_KEY = "bs_internal";

/** Fallback for the current page load when localStorage is blocked. */
let memoryInternal = false;

/**
 * True on the admin's own site (admin.brightonsolution.com), where the /admin page is served at "/".
 * Server render is false; the admin page is still recognised there by its /admin path, so the
 * static HTML and the hydrated page agree.
 */
export function isAdminHost(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return ADMIN_HOSTS.includes(window.location.hostname);
  } catch {
    return false;
  }
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || isAdminHost();
}

/** Query parameter that marks (?bs_internal=on) or unmarks (=off) this browser on the website. */
export const INTERNAL_PARAM = "bs_internal";

/**
 * Applies ?bs_internal=on|off from the current URL and removes it from the address bar. The admin
 * runs on its own site, whose storage the website cannot read, so it links here to mark a browser.
 */
export function applyInternalParam(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(INTERNAL_PARAM);
    if (value !== "on" && value !== "off") return;
    setInternalBrowser(value === "on");
    url.searchParams.delete(INTERNAL_PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore: the browser simply stays as it was */
  }
}

/** True when this browser is marked as one of the team's own (see setInternalBrowser). */
export function isInternalBrowser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(INTERNAL_KEY);
    if (stored !== null) return stored === "1";
  } catch {
    /* storage blocked: use the in-memory value */
  }
  return memoryInternal;
}

/**
 * Marks (or unmarks) this browser as one of the team's own. While marked, analyticsAllowed() is
 * false: no page views, clicks or Google Analytics, and contact enquiries carry no visitor id.
 * Marking applies at once in every open tab of this browser (the tracker re-checks before each
 * write); unmarking applies from the next full page load.
 */
export function setInternalBrowser(on: boolean): void {
  memoryInternal = on;
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(INTERNAL_KEY, "1");
    else window.localStorage.removeItem(INTERNAL_KEY);
  } catch {
    /* storage blocked: the choice lasts for this page load only */
  }
}

/** Environment-level checks (independent of the current route). */
export function analyticsAllowed(): boolean {
  if (BUILD_DISABLED) return false;
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  try {
    const { protocol, hostname } = window.location;
    if (protocol !== "https:" && protocol !== "http:") return false;
    if (LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost")) return false;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl === true) return false;
    if (nav.webdriver === true) return false;
    if (BOT_PATTERN.test(nav.userAgent || "")) return false;
    if (isInternalBrowser()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Environment checks plus the route check. */
export function shouldTrack(pathname: string): boolean {
  return !isAdminPath(pathname) && analyticsAllowed();
}

/** True when the visitor has asked browsers not to be tracked (used by the consent bar). */
export function prefersNoTracking(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    return nav.globalPrivacyControl === true;
  } catch {
    return false;
  }
}
