import type { ContactRecord, LeadRecord } from "@/lib/firebase/schema";

/**
 * Wording of "new enquiry" notifications. PURE: no DOM, no React, no imports with side effects
 * (type-only imports), so the push server (push-server/index.js, notify.js is generated from this file)
 * sends the same wording.
 *
 *   leadNotification(lead)       -> "New landing lead · Growth plan · ₹79,999"
 *   contactNotification(contact) -> "New contact · Website design"
 *   summaryNotification(n, m)    -> one notification for a burst ("3 new enquiries")
 *
 * Body lines (only the ones that have data): name · company / phone · email / what they want
 * (project types, budget and timeline, service, or the first line of the message).
 * data.url is a hash route of the admin app ("#/landing/<id>"), resolved against the admin origin.
 * When the enquiry has a usable phone number, data.whatsapp is a wa.me link and "actions" offers it
 * as a button (Android; the admin site's service worker opens it).
 */

export type NotificationPayload = {
  title: string;
  body: string;
  /** One notification per document: a repeat replaces instead of stacking. */
  tag: string;
  icon: string;
  badge: string;
  /** Epoch ms of the enquiry. */
  timestamp?: number;
  data: { url: string; kind: "lead" | "contact" | "summary"; id: string; whatsapp?: string };
  /** Notification buttons (service-worker notifications only; browsers show at most two). */
  actions?: { action: "open" | "whatsapp"; title: string }[];
};

type Meta = { id: string; createdAt?: Date | null };
export type NotifyLead = Partial<LeadRecord> & Meta;
export type NotifyContact = Partial<ContactRecord> & Meta;

const ICON = "/icon-192.png";
/** Monochrome status-bar icon (Android). */
const BADGE = "/badge-96.png";
const SITE_NAME = "BrightonSolution";
const BODY_LINE_MAX = 110;
const PLAN_UNSURE = "Help me choose";

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cut(value: string, max = BODY_LINE_MAX): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function join(parts: string[], sep = " · "): string {
  return parts.filter(Boolean).join(sep);
}

function firstLine(message: unknown): string {
  const raw = typeof message === "string" ? message : "";
  return text(raw.split(/\r?\n/).find((line) => line.trim()) ?? "");
}

/** Same output as lib/launch/lead.ts formatPrice, kept local so this file has no runtime imports. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency === "INR" ? "₹" : "$"}${amount}`;
  }
}

/**
 * wa.me link for a phone number, "" when it is not usable. Same rules as phoneDigits in records.ts:
 * "00" prefix dropped, a bare 10-digit (or 0-prefixed 11-digit) number from an Indian time zone gets 91.
 */
export function whatsappLink(phone: unknown, timeZone: unknown, message = ""): string {
  const raw = text(phone);
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const india = timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta";
  if (raw.startsWith("00")) digits = digits.slice(2);
  else if (!raw.startsWith("+") && india) {
    if (digits.length === 10) digits = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  }
  if (digits.length < 8 || digits.length > 15) return "";
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

function actionsFor(whatsapp: string, open: string): NotificationPayload["actions"] {
  return whatsapp
    ? [
        { action: "whatsapp", title: "WhatsApp" },
        { action: "open", title: open },
      ]
    : [{ action: "open", title: open }];
}

function greeting(name: unknown, about: string): string {
  const first = text(name).split(" ")[0] || "there";
  return `Hi ${first}, this is ${SITE_NAME}. Thank you for your enquiry about ${about}.`;
}

function stamp(doc: Meta): number | undefined {
  return doc.createdAt instanceof Date && Number.isFinite(doc.createdAt.getTime()) ? doc.createdAt.getTime() : undefined;
}

export function leadNotification(lead: NotifyLead): NotificationPayload {
  const plan = text(lead.plan);
  const price = typeof lead.price === "number" && lead.currency ? formatMoney(lead.price, lead.currency) : "";
  const planLabel = plan ? (plan === PLAN_UNSURE ? "Needs help choosing a plan" : `${plan} plan`) : lead.kind === "brief" ? "Project brief" : "";
  const title = join(["New landing lead", planLabel, plan && plan !== PLAN_UNSURE ? price : ""]);

  const who = join([text(lead.name) || "Someone", text(lead.company)]);
  const reach = join([text(lead.phone), text(lead.email)]);
  const want = lead.kind === "brief" ? join([text(lead.projectTypes), text(lead.stage)]) : "";
  const terms = join([text(lead.budget) ? `Budget ${text(lead.budget)}` : "", text(lead.timeline)]);
  const note = !want ? firstLine(lead.message) : "";
  const pref = text(lead.contactPref) ? `Prefers ${text(lead.contactPref)}` : "";
  const whatsapp = whatsappLink(lead.phone, lead.timeZone, greeting(lead.name, plan && plan !== PLAN_UNSURE ? `the ${plan} plan` : "your project"));

  return {
    title: cut(title, 90),
    body: [who, reach, want, terms, note, pref].filter(Boolean).map((line) => cut(line)).join("\n"),
    tag: `lead-${lead.id}`,
    icon: ICON,
    badge: BADGE,
    timestamp: stamp(lead),
    data: { url: `#/landing/${encodeURIComponent(lead.id)}`, kind: "lead", id: lead.id, ...(whatsapp ? { whatsapp } : {}) },
    actions: actionsFor(whatsapp, "Open lead"),
  };
}

export function contactNotification(contact: NotifyContact): NotificationPayload {
  const title = join(["New contact", text(contact.service) || "Website enquiry"]);
  const who = join([text(contact.name) || "Someone", text(contact.company)]);
  const reach = join([text(contact.phone), text(contact.email)]);
  const budget = text(contact.budget) ? `Budget ${text(contact.budget)}` : "";
  const message = firstLine(contact.message);
  const whatsapp = whatsappLink(contact.phone, contact.timeZone, greeting(contact.name, text(contact.service) || "your project"));

  return {
    title: cut(title, 90),
    body: [who, reach, budget, message ? `“${cut(message, 100)}”` : ""].filter(Boolean).map((line) => cut(line)).join("\n"),
    tag: `contact-${contact.id}`,
    icon: ICON,
    badge: BADGE,
    timestamp: stamp(contact),
    data: { url: `#/contacts/${encodeURIComponent(contact.id)}`, kind: "contact", id: contact.id, ...(whatsapp ? { whatsapp } : {}) },
    actions: actionsFor(whatsapp, "Open contact"),
  };
}

/** One notification instead of many when a burst arrives (more than `max` at once). */
export function summaryNotification(leads: number, contacts: number): NotificationPayload {
  const total = leads + contacts;
  const parts = [leads ? `${leads} landing ${leads === 1 ? "lead" : "leads"}` : "", contacts ? `${contacts} ${contacts === 1 ? "contact" : "contacts"}` : ""];
  return {
    title: `${total} new ${total === 1 ? "enquiry" : "enquiries"}`,
    body: join(parts, " and "),
    tag: "enquiries-summary",
    icon: ICON,
    badge: BADGE,
    data: { url: leads >= contacts ? "#/landing" : "#/contacts", kind: "summary", id: "" },
  };
}
