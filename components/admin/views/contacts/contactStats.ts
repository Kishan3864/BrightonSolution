import type { TimePoint } from "../../charts";
import { contactSource, contactStatusOf, timeOf } from "../../data/records";
import type { ContactDoc } from "../../data/types";
import type { ContactStatus } from "@/lib/firebase/schema";

/**
 * Pure figures for the Contacts view: the insight period (calendar days in local time), submissions
 * per day / week with the previous period, KPI counts and the service / budget / source breakdowns.
 * Spam never counts as a submission here; the status counts include it.
 */

export type ContactPeriod = "7d" | "30d" | "90d" | "all";

export const CONTACT_PERIODS: readonly { value: ContactPeriod; label: string; title: string; days: number | null }[] = [
  { value: "7d", label: "7d", title: "Last 7 days", days: 7 },
  { value: "30d", label: "30d", title: "Last 30 days", days: 30 },
  { value: "90d", label: "90d", title: "Last 90 days", days: 90 },
  { value: "all", label: "All", title: "Everything loaded", days: null },
];

export function periodMeta(period: ContactPeriod) {
  return CONTACT_PERIODS.find((p) => p.value === period) ?? CONTACT_PERIODS[1];
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** Local midnight of the day that contains `ms`, shifted by `offsetDays` calendar days (DST-safe). */
function dayStart(ms: number, offsetDays = 0): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays).getTime();
}

/** Monday 00:00 of the week that contains `ms`. */
function weekStart(ms: number): number {
  const d = new Date(ms);
  const back = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
}

const isCounted = (c: ContactDoc) => contactStatusOf(c) !== "spam" && timeOf(c) > 0;

export type ContactInsights = {
  period: ContactPeriod;
  /** Start of the period (ms), 0 for "all". */
  since: number;
  /** Start of the previous period of equal length, null for "all". */
  prevSince: number | null;
  /** Non-spam submissions in the period and in the previous one. */
  inPeriod: number;
  previous: number | null;
  /** Average non-spam submissions per week over the period, and how many weeks that covers. */
  perWeek: number;
  weeks: number;
  /** Status counts over everything loaded. */
  status: Record<ContactStatus, number>;
  total: number;
  /** handled / (total - spam), null without real submissions. */
  handledRate: number | null;
  /** The contact waiting longest for a reply (status new). */
  oldestNew: ContactDoc | null;
  /** Chart buckets: per day, or per week for "all". */
  unit: "day" | "week";
  points: TimePoint[];
  /** Period submissions (non-spam), for the breakdowns. */
  periodRows: ContactDoc[];
};

const dayLabel = (ms: number, short: boolean) =>
  new Date(ms).toLocaleDateString(undefined, short ? { weekday: "short", day: "numeric" } : { day: "numeric", month: "short" });

const longDay = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function contactInsights(contacts: readonly ContactDoc[], period: ContactPeriod, now: number): ContactInsights {
  const status: Record<ContactStatus, number> = { new: 0, handled: 0, spam: 0 };
  let oldestNew: ContactDoc | null = null;
  for (const c of contacts) {
    const s = contactStatusOf(c);
    status[s] += 1;
    if (s === "new" && timeOf(c) > 0 && (!oldestNew || timeOf(c) < timeOf(oldestNew))) oldestNew = c;
  }
  const real = contacts.length - status.spam;
  const counted = contacts.filter(isCounted);
  const times = counted.map(timeOf);

  const days = periodMeta(period).days;
  const points: TimePoint[] = [];
  let since = 0;
  let prevSince: number | null = null;
  let unit: "day" | "week" = "day";

  if (days) {
    since = dayStart(now, -(days - 1));
    prevSince = dayStart(now, -(2 * days - 1));
    const current = new Array<number>(days).fill(0);
    const prev = new Array<number>(days).fill(0);
    const starts = Array.from({ length: days + 1 }, (_, i) => dayStart(now, -(days - 1) + i));
    const prevStarts = Array.from({ length: days + 1 }, (_, i) => dayStart(now, -(2 * days - 1) + i));
    const slot = (t: number, edges: number[]) => {
      if (t < edges[0] || t >= edges[edges.length - 1]) return -1;
      let lo = 0;
      let hi = edges.length - 2;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (edges[mid] <= t) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };
    for (const t of times) {
      const i = slot(t, starts);
      if (i >= 0) current[i] += 1;
      else {
        const j = slot(t, prevStarts);
        if (j >= 0) prev[j] += 1;
      }
    }
    for (let i = 0; i < days; i++) {
      points.push({
        key: String(starts[i]),
        label: dayLabel(starts[i], days <= 7),
        longLabel: longDay(starts[i]),
        partial: i === days - 1,
        values: { current: current[i], previous: prev[i] },
      });
    }
  } else {
    unit = "week";
    const first = times.length ? Math.min(...times) : now;
    since = 0;
    const start = weekStart(first);
    const end = weekStart(now);
    const count = Math.max(1, Math.round((end - start) / WEEK) + 1);
    const buckets = new Array<number>(count).fill(0);
    for (const t of times) {
      const i = Math.min(count - 1, Math.max(0, Math.round((weekStart(t) - start) / WEEK)));
      buckets[i] += 1;
    }
    for (let i = 0; i < count; i++) {
      const ms = weekStart(start + i * WEEK + DAY);
      points.push({
        key: String(ms),
        label: dayLabel(ms, false),
        longLabel: `Week of ${longDay(ms)}`,
        partial: i === count - 1,
        values: { current: buckets[i] },
      });
    }
  }

  const periodRows = counted.filter((c) => timeOf(c) >= since);
  const inPeriod = periodRows.length;
  const previous = prevSince === null ? null : times.filter((t) => t >= prevSince && t < since).length;
  const spanMs = days ? days * DAY : Math.max(DAY, now - (times.length ? Math.min(...times) : now));
  const weeks = Math.max(1, spanMs / WEEK);

  return {
    period,
    since,
    prevSince,
    inPeriod,
    previous,
    perWeek: inPeriod / weeks,
    weeks,
    status,
    total: contacts.length,
    handledRate: real > 0 ? status.handled / real : null,
    oldestNew,
    unit,
    points,
    periodRows,
  };
}

export type Facet = "service" | "budget" | "source";

export const FACET_LABEL: Record<Facet, string> = { service: "Service", budget: "Budget", source: "Source" };

export const NOT_SET = "Not specified";

export function facetValue(contact: ContactDoc, facet: Facet): string {
  if (facet === "source") return contactSource(contact);
  const raw = (facet === "service" ? contact.service : contact.budget) ?? "";
  return raw.trim() || NOT_SET;
}

/** Ranked counts of one facet, with the share of all rows. */
export function breakdown(rows: readonly ContactDoc[], facet: Facet): { key: string; value: number; share: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = facetValue(row, facet);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...map.entries()]
    .map(([key, value]) => ({ key, value, share: value / total }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

/** "3 d 4 h", "5 h 12 min", "8 min" for waiting times and time to enquiry. */
export function humanDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return "under a minute";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return min % 60 ? `${hours} h ${min % 60} min` : `${hours} h`;
  const daysN = Math.floor(hours / 24);
  return hours % 24 ? `${daysN} d ${hours % 24} h` : `${daysN} d`;
}
