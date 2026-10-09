/**
 * Optional Google Analytics 4 (Firebase Analytics) via gtag.js, loaded ONLY after the visitor
 * accepts the consent bar and only when NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is set.
 * Choice is stored in localStorage "bs_consent" ("granted" | "denied").
 * Other components can reopen the bar with: window.dispatchEvent(new Event("bs:consent-reset")).
 */

export const CONSENT_KEY = "bs_consent";
export const CONSENT_RESET_EVENT = "bs:consent-reset";
export type ConsentChoice = "granted" | "denied";

type Gtag = (...args: unknown[]) => void;
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

let loadedFor: string | null = null;

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function storeConsent(choice: ConsentChoice | null): void {
  try {
    if (choice) window.localStorage.setItem(CONSENT_KEY, choice);
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* the choice then lasts for this page only */
  }
}

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/i;

/** Injects gtag.js once. Page views are sent manually on each route change (send_page_view: false). */
export function loadGtag(measurementId: string): boolean {
  if (!MEASUREMENT_ID_PATTERN.test(measurementId)) return false;
  if (loadedFor === measurementId) return true;
  try {
    const w = window as GtagWindow;
    w.dataLayer = w.dataLayer || [];
    // gtag must push the `arguments` object itself.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      (w.dataLayer as unknown[]).push(arguments);
    };
    w.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    w.gtag("js", new Date());
    w.gtag("config", measurementId, {
      send_page_view: false,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onerror = () => {
      /* blocked or offline: nothing else depends on it */
    };
    document.head.appendChild(script);
    loadedFor = measurementId;
    return true;
  } catch {
    return false;
  }
}

export function gtagPageView(path: string): void {
  try {
    const w = window as GtagWindow;
    if (!loadedFor || typeof w.gtag !== "function") return;
    w.gtag("event", "page_view", {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    });
  } catch {
    /* silent */
  }
}

/** Revokes analytics storage for the rest of this page (a reload stops gtag entirely). */
export function revokeGtag(): void {
  try {
    const w = window as GtagWindow;
    if (typeof w.gtag === "function") w.gtag("consent", "update", { analytics_storage: "denied" });
  } catch {
    /* silent */
  }
}
