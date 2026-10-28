import type { ContactRecord, LeadRecord } from "@/lib/firebase/schema";

/**
 * Wording of "new enquiry" notifications. PURE: no DOM, no React, no imports with side effects
 * (type-only imports), so the later Cloud Function that sends web push can reuse it unchanged.
 *
 *   leadNotification(lead)       -> "New landing lead · Growth plan · ₹79,999"
 *   contactNotification(contact) -> "New contact · Website design"
 *   summaryNotification(n, m)    -> one notification for a burst ("3 new enquiries")
 *
 * Body lines (only the ones that have data): name · company / phone · email / what they want
 * (project types, budget and timeline, service, or the first line of the message).
 * data.url is a hash route of the admin app ("#/landing/<id>"), resolved against the admin origin.
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
  data: { url: string; kind: "lead" | "contact" | "summary"; id: string };
};

type Meta = { id: string; createdAt?: Date | null };
export type NotifyLead = Partial<LeadRecord> & Meta;
export type NotifyContact = Partial<ContactRecord> & Meta;

const ICON = "/icon-192.png";
const BADGE = "/icon-192.png";
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

  return {
    title: cut(title, 90),
    body: [who, reach, want, terms, note, pref].filter(Boolean).map((line) => cut(line)).join("\n"),
    tag: `lead-${lead.id}`,
    icon: ICON,
    badge: BADGE,
    timestamp: stamp(lead),
    data: { url: `#/landing/${encodeURIComponent(lead.id)}`, kind: "lead", id: lead.id },
  };
}

export function contactNotification(contact: NotifyContact): NotificationPayload {
  const title = join(["New contact", text(contact.service) || "Website enquiry"]);
  const who = join([text(contact.name) || "Someone", text(contact.company)]);
  const reach = join([text(contact.phone), text(contact.email)]);
  const budget = text(contact.budget) ? `Budget ${text(contact.budget)}` : "";
  const message = firstLine(contact.message);

  return {
    title: cut(title, 90),
    body: [who, reach, budget, message ? `“${cut(message, 100)}”` : ""].filter(Boolean).map((line) => cut(line)).join("\n"),
    tag: `contact-${contact.id}`,
    icon: ICON,
    badge: BADGE,
    timestamp: stamp(contact),
    data: { url: `#/contacts/${encodeURIComponent(contact.id)}`, kind: "contact", id: contact.id },
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
