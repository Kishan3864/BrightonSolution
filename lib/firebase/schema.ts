/**
 * Shared Firestore data contract. firestore.rules mirrors every list and limit here —
 * change both together.
 *
 * Collections
 * - contacts   one document per contact-form submission (public create, admin read/update/delete)
 * - pageviews  one document per page view, written when the visitor leaves/hides the page
 * - events     CTA / outbound / mailto / Play Store / form interactions
 *
 * Every collection gets `createdAt` from the server (REQUEST_TIME transform in createDocument);
 * never send it from the client. Optional fields may be omitted; when sent they must respect
 * the types and limits below or the whole write is rejected. Integers must be whole numbers
 * (Math.round) so they encode as Firestore integers.
 *
 * Exports: COLLECTIONS, ID_PATTERN, CONTACT_FIELDS, CONTACT_REQUIRED, CONTACT_LIMITS,
 * CONTACT_STATUSES, PAGEVIEW_FIELDS, PAGEVIEW_REQUIRED, PAGEVIEW_LIMITS, DEVICE_TYPES,
 * EVENT_FIELDS, EVENT_REQUIRED, EVENT_LIMITS, EVENT_TYPES, RETENTION_DAYS, retentionExpiry(), record types (ContactRecord,
 * PageviewRecord, EventRecord, TrackDetail), clip(), cleanUrl().
 */

export const COLLECTIONS = {
  contacts: "contacts",
  pageviews: "pageviews",
  events: "events",
} as const;

/** visitorId / sessionId format (rules: '^[A-Za-z0-9_-]{8,64}$'). */
export const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/* ---------------------------------------------------------------- contacts */

export const CONTACT_FIELDS = [
  "name",
  "company",
  "email",
  "phone",
  "service",
  "budget",
  "message",
  "page",
  "referrer",
  "userAgent",
  "language",
  "timeZone",
  "visitorId",
  "status",
] as const;

/** createdAt is also required but is set by the server. */
export const CONTACT_REQUIRED = ["name", "email", "message", "status"] as const;

/** Maximum string lengths (message also has a minimum). */
export const CONTACT_LIMITS = {
  name: 120,
  company: 160,
  email: 254,
  phone: 40,
  service: 120,
  budget: 60,
  messageMin: 20,
  message: 5000,
  page: 300,
  referrer: 500,
  userAgent: 400,
  language: 35,
  timeZone: 64,
  visitorId: 64,
} as const;

export const CONTACT_STATUSES = ["new", "handled", "spam"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type ContactRecord = {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  service?: string;
  budget?: string;
  message: string;
  page?: string;
  referrer?: string;
  userAgent?: string;
  language?: string;
  timeZone?: string;
  visitorId?: string;
  status: ContactStatus;
};

/* --------------------------------------------------------------- pageviews */

export const PAGEVIEW_FIELDS = [
  "visitorId",
  "sessionId",
  "path",
  "title",
  "referrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "durationMs",
  "scrollDepth",
  "viewportW",
  "viewportH",
  "screenW",
  "screenH",
  "language",
  "timeZone",
  "device",
  "browser",
  "os",
  "isNewVisitor",
  "pageIndex",
  "expireAt",
] as const;

export const PAGEVIEW_REQUIRED = ["visitorId", "sessionId", "path", "durationMs", "expireAt"] as const;

export const DEVICE_TYPES = ["mobile", "tablet", "desktop"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

/** Strings: max length. Integers: inclusive [min, max]. */
export const PAGEVIEW_LIMITS = {
  path: 300,
  title: 300,
  referrer: 500,
  utmSource: 100,
  utmMedium: 100,
  utmCampaign: 100,
  language: 35,
  timeZone: 64,
  browser: 40,
  os: 40,
  durationMs: [0, 21_600_000],
  scrollDepth: [0, 100],
  viewportW: [0, 10_000],
  viewportH: [0, 10_000],
  screenW: [0, 10_000],
  screenH: [0, 10_000],
  pageIndex: [0, 1000],
} as const;

export type PageviewRecord = {
  visitorId: string;
  sessionId: string;
  path: string;
  title?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  durationMs: number;
  scrollDepth?: number;
  viewportW?: number;
  viewportH?: number;
  screenW?: number;
  screenH?: number;
  language?: string;
  timeZone?: string;
  device?: DeviceType;
  browser?: string;
  os?: string;
  isNewVisitor?: boolean;
  pageIndex?: number;
  /** Expiry time, about 26 months after creation (see RETENTION_DAYS). */
  expireAt: Date;
};

/**
 * Page views and events are kept for about 26 months (privacy policy). Each record carries
 * expireAt = now + RETENTION_DAYS; the admin dashboard deletes records older than RETENTION_DAYS
 * each time it is opened (Firestore TTL policies would need a billing-enabled project and can be
 * added on expireAt later). firestore.rules accepts 760–820 days to tolerate clock skew.
 */
export const RETENTION_DAYS = 790;

export function retentionExpiry(now: number = Date.now()): Date {
  return new Date(now + RETENTION_DAYS * 86_400_000);
}

/* ------------------------------------------------------------------ events */

export const EVENT_FIELDS = ["visitorId", "sessionId", "type", "label", "href", "path", "expireAt"] as const;

export const EVENT_REQUIRED = ["visitorId", "sessionId", "type", "path", "expireAt"] as const;

export const EVENT_TYPES = [
  "cta_click",
  "outbound",
  "play",
  "mailto",
  "tel",
  "form_submit",
  "nav",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LIMITS = {
  label: 200,
  href: 500,
  path: 300,
} as const;

export type EventRecord = {
  visitorId: string;
  sessionId: string;
  type: EventType;
  label?: string;
  href?: string;
  path: string;
  /** Expiry time, about 26 months after creation (see RETENTION_DAYS). */
  expireAt: Date;
};

/** Detail of the window CustomEvent "bs:track" that UI components dispatch for the analytics layer. */
export type TrackDetail = { type: EventType; label?: string; href?: string; ok?: boolean };

/* ----------------------------------------------------------------- helpers */

/** Trim and cut a string to at most `max` UTF-16 units (always within the rules' character limit). */
export function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Drop query string and hash from a URL (referrers can carry tokens or personal data). */
export function cleanUrl(value: string, max = 500): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return clip(`${url.origin}${url.pathname}`, max);
  } catch {
    return clip(value.split(/[?#]/)[0] ?? "", max);
  }
}
