/**
 * Client helpers for the private landing page: build a lead from what the visitor typed plus the
 * page context (UTM tags of the shared link, referrer, language, time zone), save it to the
 * `leads` collection, and hand interactions to the analytics layer.
 *
 * Exports: saveLead(fields), trackLaunch(detail), formatPrice(amount, currency),
 * defaultCurrency(), EMAIL_RE, PHONE_RE.
 */
import { analyticsAllowed } from "@/lib/analytics/env";
import { peekVisitorId } from "@/lib/analytics/identity";
import { createDocument } from "@/lib/firebase/firestore";
import {
  COLLECTIONS,
  LEAD_LIMITS,
  clip,
  cleanUrl,
  type LeadCurrency,
  type LeadKind,
  type LeadRecord,
  type TrackDetail,
} from "@/lib/firebase/schema";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[\d\s().-]{6,}$/;

export type LeadFields = {
  kind: LeadKind;
  name: string;
  email: string;
  phone: string;
  company?: string;
  projectTypes?: string;
  features?: string;
  stage?: string;
  timeline?: string;
  budget?: string;
  plan?: string;
  currency?: LeadCurrency;
  price?: number;
  contactPref?: string;
  message?: string;
};

function readTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

/** utm_* tags of the link the visitor opened (the owner shares the page with tagged links). */
function readUtm(): Pick<LeadRecord, "utmSource" | "utmMedium" | "utmCampaign" | "utmTerm" | "utmContent"> {
  try {
    const params = new URLSearchParams(window.location.search);
    const get = (key: string) => clip(params.get(key) ?? "", LEAD_LIMITS.utm);
    return {
      utmSource: get("utm_source"),
      utmMedium: get("utm_medium"),
      utmCampaign: get("utm_campaign"),
      utmTerm: get("utm_term"),
      utmContent: get("utm_content"),
    };
  } catch {
    return {};
  }
}

/** Empty strings are left out, so the document only carries what the visitor actually gave. */
function compact<T extends Record<string, unknown>>(record: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === "") continue;
    out[key] = value;
  }
  return out as T;
}

export async function saveLead(fields: LeadFields): Promise<boolean> {
  const price =
    typeof fields.price === "number" && Number.isFinite(fields.price)
      ? Math.max(0, Math.min(LEAD_LIMITS.price, Math.round(fields.price)))
      : undefined;
  const record: LeadRecord = compact({
    kind: fields.kind,
    name: clip(fields.name, LEAD_LIMITS.name),
    email: clip(fields.email, LEAD_LIMITS.email),
    phone: clip(fields.phone, LEAD_LIMITS.phone),
    company: clip(fields.company, LEAD_LIMITS.company),
    projectTypes: clip(fields.projectTypes, LEAD_LIMITS.projectTypes),
    features: clip(fields.features, LEAD_LIMITS.features),
    stage: clip(fields.stage, LEAD_LIMITS.stage),
    timeline: clip(fields.timeline, LEAD_LIMITS.timeline),
    budget: clip(fields.budget, LEAD_LIMITS.budget),
    plan: clip(fields.plan, LEAD_LIMITS.plan),
    currency: fields.currency,
    price,
    contactPref: clip(fields.contactPref, LEAD_LIMITS.contactPref),
    message: clip(fields.message, LEAD_LIMITS.message),
    page: clip(window.location.pathname, LEAD_LIMITS.page),
    referrer: cleanUrl(document.referrer, LEAD_LIMITS.referrer),
    ...readUtm(),
    userAgent: clip(navigator.userAgent, LEAD_LIMITS.userAgent),
    language: clip(navigator.language, LEAD_LIMITS.language),
    timeZone: clip(readTimeZone(), LEAD_LIMITS.timeZone),
    // Same rule as the contact form: no visitor id once tracking is off.
    visitorId: analyticsAllowed() ? peekVisitorId() : "",
    status: "new",
  });
  const result = await createDocument(COLLECTIONS.leads, record);
  return result.ok;
}

/** Labels carry step, field or plan names only, never anything the visitor typed. */
export function trackLaunch(detail: TrackDetail) {
  try {
    window.dispatchEvent(new CustomEvent<TrackDetail>("bs:track", { detail }));
  } catch {
    /* analytics must never affect the page */
  }
}

export function formatPrice(amount: number, currency: LeadCurrency): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency === "INR" ? "₹" : "$"}${amount}`;
  }
}

/** Rupees for visitors whose browser is set to an Indian time zone, US dollars for everyone else. */
export function defaultCurrency(): LeadCurrency {
  const zone = readTimeZone();
  return zone === "Asia/Kolkata" || zone === "Asia/Calcutta" ? "INR" : "USD";
}
