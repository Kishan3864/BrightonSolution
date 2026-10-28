import { CONTACT_STATUSES, LEAD_STATUSES, type ContactStatus, type LeadStatus } from "@/lib/firebase/schema";
import { PLAN_UNSURE, plans } from "@/lib/content/launch";
import { formatPrice } from "@/lib/launch/lead";
import { site } from "@/lib/site";
import type { Tone } from "../kit/Pills";
import type { ContactDoc, InboxItem, LeadDoc } from "./types";

/**
 * Helpers for contact and lead records (moved from the old LeadsPanel / ContactsPanel): status labels
 * and tones, mailto / WhatsApp / tel links, source and price labels, inbox rows and search matching.
 */

/* ----------------------------------------------------------------- statuses */

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; tone: Tone; description: string }> = {
  new: { label: "New", tone: "accent", description: "Waiting for a reply" },
  contacted: { label: "Contacted", tone: "blue", description: "Replied, in conversation" },
  won: { label: "Won", tone: "green", description: "Became a project" },
  lost: { label: "Lost", tone: "muted", description: "Did not go ahead" },
  spam: { label: "Spam", tone: "red", description: "Not a real enquiry" },
};

export const CONTACT_STATUS_META: Record<ContactStatus, { label: string; tone: Tone; description: string }> = {
  new: { label: "New", tone: "accent", description: "Waiting for a reply" },
  handled: { label: "Handled", tone: "green", description: "Answered or dealt with" },
  spam: { label: "Spam", tone: "red", description: "Not a real enquiry" },
};

export { CONTACT_STATUSES, LEAD_STATUSES };

export function leadStatusOf(lead: Pick<LeadDoc, "status">): LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(lead.status ?? "") ? (lead.status as LeadStatus) : "new";
}

export function contactStatusOf(contact: Pick<ContactDoc, "status">): ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(contact.status ?? "") ? (contact.status as ContactStatus) : "new";
}

/** createdAt in ms (0 when missing). */
export function timeOf(doc: { createdAt?: Date | null }): number {
  return doc.createdAt instanceof Date && Number.isFinite(doc.createdAt.getTime()) ? doc.createdAt.getTime() : 0;
}

/** Newest first. */
export function byNewest<T extends { createdAt?: Date | null }>(a: T, b: T): number {
  return timeOf(b) - timeOf(a);
}

/* ------------------------------------------------------------------- people */

export function firstName(name: string | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Two-letter initials for avatars. */
export function initials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : (parts[0][1] ?? "");
  return (first + last).toUpperCase();
}

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isEmail(value: string | undefined): boolean {
  return EMAIL_OK.test((value ?? "").trim());
}

/** mailto: link with a subject, "" when the address is not usable. */
export function mailHref(email: string | undefined, subject: string): string {
  const address = (email ?? "").trim();
  if (!EMAIL_OK.test(address)) return "";
  return `mailto:${encodeURIComponent(address).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}`;
}

/** International digits for wa.me and tel:, guessing +91 for a bare 10-digit number from an Indian time zone. */
export function phoneDigits(phone: string | undefined, timeZone?: string): string {
  const raw = (phone ?? "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const india = timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta";
  if (raw.startsWith("00")) digits = digits.slice(2);
  else if (!raw.startsWith("+") && india) {
    if (digits.length === 10) digits = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

export function telHref(phone: string | undefined, timeZone?: string): string {
  const digits = phoneDigits(phone, timeZone);
  return digits ? `tel:+${digits}` : "";
}

export function whatsappHref(phone: string | undefined, timeZone: string | undefined, text: string): string {
  const digits = phoneDigits(phone, timeZone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : "";
}

/* -------------------------------------------------------------------- leads */

export const PLAN_NAMES: readonly string[] = [...plans.map((plan) => plan.name), PLAN_UNSURE];
export { PLAN_UNSURE };

export function planOf(lead: Pick<LeadDoc, "plan">): string {
  return lead.plan || PLAN_UNSURE;
}

export function leadKindLabel(lead: Pick<LeadDoc, "kind">): string {
  return lead.kind === "plan" ? "Plan request" : "Full brief";
}

/** "₹79,999" / "$2,499", "" without a price. */
export function priceOf(lead: Pick<LeadDoc, "price" | "currency">): string {
  if (typeof lead.price !== "number" || !lead.currency) return "";
  return formatPrice(lead.price, lead.currency);
}

/** UTM "source / medium / campaign", else the referrer host, else "Direct link". */
export function leadSource(lead: Pick<LeadDoc, "utmSource" | "utmMedium" | "utmCampaign" | "referrer">): string {
  const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ");
  if (utm) return utm;
  return referrerLabel(lead.referrer) || "Direct link";
}

/**
 * The value as a link target only when it is a plain http(s) URL, else null. Referrers are written by
 * anonymous visitors (the rules only cap their length), so a "javascript:", "data:" or custom-protocol
 * value must never become a clickable link in the signed-in admin; callers show it as text instead.
 */
export function safeHttpUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function referrerLabel(referrer: string | undefined): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

export function leadMailHref(lead: LeadDoc): string {
  const about = lead.plan && lead.plan !== PLAN_UNSURE ? `${lead.plan} plan` : "project";
  return mailHref(lead.email, `Your ${about} with ${site.name}`);
}

export function leadWhatsappHref(lead: LeadDoc): string {
  const about = lead.plan && lead.plan !== PLAN_UNSURE ? `the ${lead.plan} plan` : "your project";
  const text = `Hi ${firstName(lead.name) || "there"}, this is ${site.name}. Thank you for your enquiry about ${about}.`;
  return whatsappHref(lead.phone, lead.timeZone, text);
}

export function leadTelHref(lead: LeadDoc): string {
  return telHref(lead.phone, lead.timeZone);
}

/** One line for lists: "Growth plan · ₹79,999" or the project types or the message start. */
export function leadSummary(lead: LeadDoc): string {
  const price = priceOf(lead);
  if (lead.kind === "plan" || (lead.plan && lead.plan !== PLAN_UNSURE)) {
    const plan = lead.plan && lead.plan !== PLAN_UNSURE ? `${lead.plan} plan` : "Help choosing a plan";
    return [plan, price].filter(Boolean).join(" · ");
  }
  return lead.projectTypes || firstLine(lead.message) || "Project brief";
}

/* ----------------------------------------------------------------- contacts */

export function contactMailHref(contact: ContactDoc): string {
  return mailHref(contact.email, `Re: your enquiry to ${site.name}`);
}

export function contactWhatsappHref(contact: ContactDoc): string {
  const text = `Hi ${firstName(contact.name) || "there"}, this is ${site.name}. Thank you for your message.`;
  return whatsappHref(contact.phone, contact.timeZone, text);
}

export function contactTelHref(contact: ContactDoc): string {
  return telHref(contact.phone, contact.timeZone);
}

export function contactSource(contact: Pick<ContactDoc, "referrer">): string {
  return referrerLabel(contact.referrer) || "Direct";
}

export function contactSummary(contact: ContactDoc): string {
  return contact.service || firstLine(contact.message) || "Website enquiry";
}

/* -------------------------------------------------------------------- inbox */

export function firstLine(text: string | undefined, max = 120): string {
  const line = (text ?? "").trim().split(/\r?\n/).find((part) => part.trim()) ?? "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line.trim();
}

export function contactToInbox(contact: ContactDoc, lastSeen: number): InboxItem {
  return {
    source: "contact",
    id: contact.id,
    createdAt: contact.createdAt ?? null,
    name: contact.name || "(no name)",
    company: contact.company ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    summary: contactSummary(contact),
    status: contactStatusOf(contact),
    fresh: lastSeen > 0 && timeOf(contact) > lastSeen,
    href: `#/contacts/${encodeURIComponent(contact.id)}`,
  };
}

export function leadToInbox(lead: LeadDoc, lastSeen: number): InboxItem {
  return {
    source: "landing",
    id: lead.id,
    createdAt: lead.createdAt ?? null,
    name: lead.name || "(no name)",
    company: lead.company ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    summary: leadSummary(lead),
    status: leadStatusOf(lead),
    fresh: lastSeen > 0 && timeOf(lead) > lastSeen,
    href: `#/landing/${encodeURIComponent(lead.id)}`,
  };
}

/** Case-insensitive match of `needle` against any of the given values. */
export function matchesQuery(needle: string, values: readonly (string | number | null | undefined)[]): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return values.some((value) => value !== null && value !== undefined && String(value).toLowerCase().includes(q));
}

export function contactSearchValues(contact: ContactDoc): (string | undefined)[] {
  return [contact.name, contact.email, contact.phone, contact.company, contact.service, contact.budget, contact.message, contact.note];
}

export function leadSearchValues(lead: LeadDoc): (string | undefined)[] {
  return [lead.name, lead.email, lead.phone, lead.company, lead.projectTypes, lead.features, lead.plan, lead.budget, lead.message, lead.note];
}

/* -------------------------------------------------------------------- times */

/** "just now", "5 min ago", "3 h ago", "2 d ago", else a short date. */
export function timeAgo(date: Date | null | undefined, now = Date.now()): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  const diff = Math.max(0, now - date.getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}
