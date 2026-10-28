import type { LeadCurrency, LeadStatus } from "@/lib/firebase/schema";
import { formatPrice } from "@/lib/launch/lead";
import type { TimePoint } from "../../charts";
import { LEAD_STATUSES, leadStatusOf, planOf, referrerLabel, timeOf } from "../../data/records";
import { rangeOf, type LeadDoc, type RangeKey } from "../../data/types";

/**
 * Pure figures for the Landing view: range windows, status counts, pipeline value per currency,
 * leads-per-bucket points (current + previous period) and the breakdown lists (plan, project type,
 * budget, timeline, UTM, contact preference). No React here, so the numbers are easy to check.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type Window = { since: number; until: number; prevSince: number };

/** The selected range ending now, plus the previous period of equal length. */
export function windowOf(range: RangeKey, now: number): Window {
  const span = rangeOf(range).ms;
  return { since: now - span, until: now, prevSince: now - 2 * span };
}

export function isSpam(lead: LeadDoc): boolean {
  return leadStatusOf(lead) === "spam";
}

export type LeadStats = {
  total: number;
  byStatus: Record<LeadStatus, number>;
  /** Non-spam leads in the range / the previous period / the last 7 days. */
  inRange: number;
  previous: number;
  week: number;
  /** won / (won + lost), null before anything was decided. */
  winRate: number | null;
  /** Price sums per currency: open = new + contacted, won = won. Only leads with a price count. */
  value: { currency: LeadCurrency; open: number; openCount: number; won: number; wonCount: number }[];
};

export function leadStats(leads: readonly LeadDoc[], win: Window, now: number): LeadStats {
  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  const value = new Map<LeadCurrency, LeadStats["value"][number]>();
  let inRange = 0;
  let previous = 0;
  let week = 0;
  for (const lead of leads) {
    const status = leadStatusOf(lead);
    byStatus[status] += 1;
    if (status === "spam") continue;
    const t = timeOf(lead);
    if (t >= win.since && t <= win.until) inRange += 1;
    else if (t >= win.prevSince && t < win.since) previous += 1;
    if (t >= now - 7 * DAY) week += 1;
    if (typeof lead.price === "number" && lead.currency && (status === "new" || status === "contacted" || status === "won")) {
      const row = value.get(lead.currency) ?? { currency: lead.currency, open: 0, openCount: 0, won: 0, wonCount: 0 };
      if (status === "won") {
        row.won += lead.price;
        row.wonCount += 1;
      } else {
        row.open += lead.price;
        row.openCount += 1;
      }
      value.set(lead.currency, row);
    }
  }
  const decided = byStatus.won + byStatus.lost;
  return {
    total: leads.length,
    byStatus,
    inRange,
    previous,
    week,
    winRate: decided ? byStatus.won / decided : null,
    // INR first (the main market), then the rest.
    value: [...value.values()].sort((a, b) => (a.currency === "INR" ? -1 : b.currency === "INR" ? 1 : a.currency.localeCompare(b.currency))),
  };
}

export function money(amount: number, currency: LeadCurrency): string {
  return formatPrice(amount, currency);
}

/* ------------------------------------------------------------------ timeline */

function startOfHour(t: number): number {
  const d = new Date(t);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar-aligned start of bucket i (local time; days are not always 24 h around DST changes). */
function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/**
 * Non-spam leads per hour (24h range) or per day (other ranges), the last bucket holding now.
 * `previous` counts the same bucket one range earlier, for the dashed comparison line.
 */
export function leadPoints(leads: readonly LeadDoc[], range: RangeKey, now: number): TimePoint[] {
  const hourly = range === "24h";
  const count = hourly ? 24 : Math.round(rangeOf(range).ms / DAY);
  const starts: number[] = [];
  if (hourly) {
    const last = startOfHour(now);
    for (let i = count - 1; i >= 0; i -= 1) starts.push(last - i * HOUR);
  } else {
    const last = startOfDay(now);
    for (let i = count - 1; i >= 0; i -= 1) starts.push(addDays(last, -i));
  }
  const endOf = (start: number) => (hourly ? start + HOUR : addDays(start, 1));
  const shift = (start: number) => (hourly ? start - count * HOUR : addDays(start, -count));
  const times = leads.filter((l) => !isSpam(l)).map(timeOf).filter((t) => t > 0);
  const countIn = (from: number, to: number) => times.reduce((n, t) => (t >= from && t < to ? n + 1 : n), 0);

  return starts.map((start) => {
    const date = new Date(start);
    const prevStart = shift(start);
    return {
      key: String(start),
      label: hourly
        ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
        : date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      longLabel: hourly
        ? `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}`
        : date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      partial: endOf(start) > now,
      values: { current: countIn(start, endOf(start)), previous: countIn(prevStart, shift(endOf(start))) },
    };
  });
}

/* ---------------------------------------------------------------- breakdowns */

export type Breakdown = { key: string; label: string; value: number; share: number };

/** Counts leads per label (a lead may give several labels, e.g. project types). Sorted by count. */
export function breakdown(leads: readonly LeadDoc[], pick: (lead: LeadDoc) => string | readonly string[] | undefined, fallback?: string): Breakdown[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const raw = pick(lead);
    const labels = (Array.isArray(raw) ? raw : [raw]).map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
    if (labels.length === 0 && fallback) labels.push(fallback);
    for (const label of new Set(labels)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = leads.length || 1;
  return [...counts.entries()]
    .map(([label, value]) => ({ key: label, label, value, share: value / total }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** "Website, Mobile app" -> ["Website", "Mobile app"]. */
export function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Where a lead came from, by UTM source, else the referrer host, else "Direct link". */
export function sourceLabel(lead: LeadDoc): string {
  return lead.utmSource || referrerLabel(lead.referrer) || "Direct link";
}

/** Plan counts in the fixed plan order (Starter, Growth, Premium, Help me choose), zeros included. */
export function planCounts(leads: readonly LeadDoc[], names: readonly string[]): { name: string; count: number; share: number }[] {
  const total = leads.length || 1;
  return names.map((name) => {
    const count = leads.reduce((n, lead) => (planOf(lead) === name ? n + 1 : n), 0);
    return { name, count, share: count / total };
  });
}
