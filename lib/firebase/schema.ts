/**
 * Shared Firestore data contract. firestore.rules mirrors every list and limit here —
 * change both together.
 *
 * Collections
 * - contacts   one document per contact-form submission (public create, admin read/update/delete)
 * - pageviews  one document per page view, written when the visitor leaves/hides the page
 * - events     CTA / outbound / mailto / Play Store / form interactions
 * - settings   admin-only dashboard settings: one document, settings/dashboard (DashboardSettings)
 * - leads      one document per enquiry from the private landing page (LAUNCH_PATH in lib/site.ts):
 *              the full project brief or a plan request (public create, admin read/update/delete)
 *
 * contacts, leads, pageviews and events get `createdAt` from the server (REQUEST_TIME transform in
 * createDocument); never send it from the client. settings/dashboard carries a server `updatedAt`
 * instead (setDocument with serverTimestamp: "updatedAt"). Optional fields may be omitted; when sent
 * they must respect the types and limits below or the whole write is rejected. Integers must be
 * whole numbers (Math.round) so they encode as Firestore integers. New fields are only ever added
 * as optional, so pages cached by the service worker that send the older payloads stay valid.
 *
 * Exports: COLLECTIONS, ID_PATTERN, CONTACT_FIELDS, CONTACT_REQUIRED, CONTACT_LIMITS,
 * CONTACT_STATUSES, PAGEVIEW_FIELDS, PAGEVIEW_REQUIRED, PAGEVIEW_LIMITS, DEVICE_TYPES,
 * EVENT_FIELDS, EVENT_REQUIRED, EVENT_LIMITS, EVENT_TYPES, RETENTION_DAYS, retentionExpiry(),
 * SETTINGS_DOC_ID, MAX_EXCLUDED_VISITORS, LEAD_FIELDS, LEAD_REQUIRED, LEAD_LIMITS, LEAD_KINDS,
 * LEAD_STATUSES, LEAD_CURRENCIES, record types (ContactRecord, PageviewRecord, EventRecord,
 * TrackDetail, DashboardSettings, LeadRecord), clip(), cleanUrl().
 */

export const COLLECTIONS = {
  contacts: "contacts",
  pageviews: "pageviews",
  events: "events",
  settings: "settings",
  leads: "leads",
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
  "utmTerm",
  "utmContent",
  "durationMs",
  "scrollDepth",
  "loadMs",
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
  utmTerm: 100,
  utmContent: 100,
  language: 35,
  timeZone: 64,
  browser: 40,
  os: 40,
  durationMs: [0, 21_600_000],
  scrollDepth: [0, 100],
  loadMs: [0, 120_000],
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
  /** utm_term of the session's landing page (landing page only, like the other UTM fields). */
  utmTerm?: string;
  /** utm_content of the session's landing page. */
  utmContent?: string;
  /** Visible time on the page in ms (time while the tab was hidden is not counted). */
  durationMs: number;
  /** Maximum share of the page that has been on screen, 0-100. */
  scrollDepth?: number;
  /**
   * Page load time in ms: navigation start to the end of the load event, or to DOMContentLoaded when
   * the visitor left before the load finished. Only on the first page view after a full page load;
   * absent on client-side route changes, continuation segments, pages that loaded in a background
   * tab and browsers without Navigation Timing.
   */
  loadMs?: number;
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

/**
 * Contact-form events (window "bs:track" from components/ContactForm.tsx; never any form contents):
 * - form_start   first focus or input in a form field, once per page view; label "contact"
 * - form_error   client validation blocked a submit; label "contact:" + invalid field names joined by ","
 * - form_submit  a submission was sent; label "contact:ok" or "contact:failed"
 */
export const EVENT_TYPES = [
  "cta_click",
  "outbound",
  "play",
  "mailto",
  "tel",
  "form_submit",
  "nav",
  "form_start",
  "form_error",
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

/* ---------------------------------------------------------------- settings */

/** The only document in the settings collection: settings/dashboard (admin read and write only). */
export const SETTINGS_DOC_ID = "dashboard";

/** Maximum length of DashboardSettings.excludedVisitors (firestore.rules enforces the same size). */
export const MAX_EXCLUDED_VISITORS = 500;

export type DashboardSettings = {
  /** Visitor ids (bs_vid) of the team's own browsers; reports leave their page views and events out. */
  excludedVisitors: string[];
  /** Server time of the last save (REQUEST_TIME transform; the rules accept only request.time). */
  updatedAt?: Date;
};

/* ------------------------------------------------------------------- leads */

export const LEAD_FIELDS = [
  "kind",
  "name",
  "email",
  "phone",
  "company",
  "projectTypes",
  "features",
  "stage",
  "timeline",
  "budget",
  "plan",
  "currency",
  "price",
  "contactPref",
  "message",
  "page",
  "referrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "userAgent",
  "language",
  "timeZone",
  "visitorId",
  "status",
] as const;

/** createdAt is also required but is set by the server. */
export const LEAD_REQUIRED = ["kind", "name", "email", "phone", "status"] as const;

/** Maximum string lengths (phone also has a minimum). price is a whole number in [0, LEAD_LIMITS.price]. */
export const LEAD_LIMITS = {
  name: 120,
  email: 254,
  phoneMin: 6,
  phone: 40,
  company: 160,
  projectTypes: 400,
  features: 800,
  stage: 120,
  timeline: 60,
  budget: 60,
  plan: 40,
  price: 100_000_000,
  contactPref: 40,
  message: 3000,
  page: 300,
  referrer: 500,
  utm: 100,
  userAgent: 400,
  language: 35,
  timeZone: 64,
  note: 2000,
} as const;

/** brief = the full landing-page form; plan = the short request sent from a plan's button. */
export const LEAD_KINDS = ["brief", "plan"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const LEAD_STATUSES = ["new", "contacted", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_CURRENCIES = ["USD", "INR"] as const;
export type LeadCurrency = (typeof LEAD_CURRENCIES)[number];

export type LeadRecord = {
  kind: LeadKind;
  name: string;
  email: string;
  phone: string;
  company?: string;
  /** Labels of the chosen project types, joined with ", ". */
  projectTypes?: string;
  /** Labels of the chosen features, joined with ", ". */
  features?: string;
  stage?: string;
  timeline?: string;
  budget?: string;
  /** Plan name ("Starter", "Growth", "Premium") or "Help me choose". */
  plan?: string;
  /** Currency the visitor saw the prices and budgets in. */
  currency?: LeadCurrency;
  /** Price of the chosen plan as shown to the visitor, in `currency`. */
  price?: number;
  contactPref?: string;
  message?: string;
  page?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  userAgent?: string;
  language?: string;
  timeZone?: string;
  visitorId?: string;
  status: LeadStatus;
  /** Admin-only follow-up note (never sent by the public page). */
  note?: string;
};

/* ----------------------------------------------------------------- helpers */

/** Trim and cut a string to at most `max` UTF-16 units (always within the rules' character limit). */
export function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  let text = value.trim();
  if (text.length > max) text = text.slice(0, max);
  // Never end on the first half of a surrogate pair (an emoji cut in two is not valid text).
  const last = text.charCodeAt(text.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) text = text.slice(0, -1);
  return text;
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
