/**
 * When first-party analytics (and optional GA4) may run.
 *
 * Tracking is OFF when any of these is true:
 * - NEXT_PUBLIC_ANALYTICS_DISABLED === "true" (build-time switch)
 * - the page is served from localhost / 127.0.0.1 / ::1 / 0.0.0.0, or not over http(s)
 * - the visitor sends Global Privacy Control (navigator.globalPrivacyControl === true)
 * - the browser is automated or a known crawler (navigator.webdriver, bot user agents)
 * - the route is /admin (the dashboard never measures itself)
 */

const BUILD_DISABLED = process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "true";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|phantom|puppeteer|playwright|selenium/i;

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
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
