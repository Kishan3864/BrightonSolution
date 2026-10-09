/**
 * Pure aggregation for the /admin dashboard. Works on decoded Firestore documents.
 *
 * Page-view records can be split into segments (see lib/analytics/tracker.ts): every segment of one
 * page view shares sessionId + pageIndex. mergePageviews() folds them back into single views
 * (time = sum of segments, scroll = max, attributes from the earliest segment).
 */

import type { ContactRecord, EventRecord, PageviewRecord } from "@/lib/firebase/schema";

export type WithMeta<T> = Partial<T> & { id: string; createdAt?: Date | null; updatedAt?: Date | null };

export type PageviewDoc = WithMeta<PageviewRecord>;
export type EventDoc = WithMeta<EventRecord>;
export type ContactDoc = WithMeta<ContactRecord>;

export type View = PageviewDoc & { createdAt: Date; durationMs: number; segments: number };

const MAX_DURATION_MS = 21_600_000;

function validDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mergePageviews(docs: PageviewDoc[]): View[] {
  const byKey = new Map<string, View>();
  const sorted = docs
    .filter((doc) => validDate(doc.createdAt))
    .sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

  for (const doc of sorted) {
    const key =
      doc.sessionId && typeof doc.pageIndex === "number" && doc.pageIndex > 0
        ? `${doc.sessionId}:${doc.pageIndex}:${doc.path ?? ""}`
        : `doc:${doc.id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...doc,
        createdAt: doc.createdAt as Date,
        durationMs: Math.min(MAX_DURATION_MS, num(doc.durationMs)),
        scrollDepth: num(doc.scrollDepth),
        segments: 1,
      });
      continue;
    }
    existing.durationMs = Math.min(MAX_DURATION_MS, existing.durationMs + num(doc.durationMs));
    existing.scrollDepth = Math.max(num(existing.scrollDepth), num(doc.scrollDepth));
    existing.segments += 1;
  }
  return [...byKey.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/* -------------------------------------------------------------------- KPIs */

export type Kpis = {
  pageViews: number;
  visitors: number;
  sessions: number;
  /** Mean visible time over views with recorded time (> 0). */
  avgTimeMs: number;
  pagesPerSession: number;
  newVisitors: number;
  returningVisitors: number;
  contacts: number;
  events: number;
};

export function computeKpis(views: View[], events: EventDoc[], contacts: ContactDoc[]): Kpis {
  const visitors = new Map<string, boolean>();
  const sessions = new Set<string>();
  let timed = 0;
  let timeTotal = 0;
  for (const view of views) {
    if (view.visitorId) visitors.set(view.visitorId, (visitors.get(view.visitorId) ?? false) || view.isNewVisitor === true);
    if (view.sessionId) sessions.add(view.sessionId);
    if (view.durationMs > 0) {
      timed += 1;
      timeTotal += view.durationMs;
    }
  }
  let newVisitors = 0;
  for (const isNew of visitors.values()) if (isNew) newVisitors += 1;
  return {
    pageViews: views.length,
    visitors: visitors.size,
    sessions: sessions.size,
    avgTimeMs: timed ? timeTotal / timed : 0,
    pagesPerSession: sessions.size ? views.length / sessions.size : 0,
    newVisitors,
    returningVisitors: visitors.size - newVisitors,
    contacts: contacts.length,
    events: events.length,
  };
}

/* --------------------------------------------------------------- timeline */

export type Bucket = { start: Date; label: string; longLabel: string; views: number };

/** Hourly buckets for ranges up to 48 h, daily buckets otherwise (local time). */
export function timeline(views: View[], since: Date, until: Date): Bucket[] {
  const hourly = until.getTime() - since.getTime() <= 48 * 3600 * 1000;
  const step = hourly ? 3600 * 1000 : 24 * 3600 * 1000;
  const first = new Date(since);
  if (hourly) first.setMinutes(0, 0, 0);
  else first.setHours(0, 0, 0, 0);

  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  const keyOf = (d: Date) =>
    hourly
      ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
      : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  for (let t = first.getTime(); t <= until.getTime(); ) {
    const start = new Date(t);
    const bucket: Bucket = {
      start,
      label: hourly
        ? start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        : start.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      longLabel: hourly
        ? start.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      views: 0,
    };
    buckets.push(bucket);
    index.set(keyOf(start), bucket);
    // Step by calendar unit so DST changes do not drift the buckets.
    const next = new Date(start);
    if (hourly) next.setHours(next.getHours() + 1);
    else next.setDate(next.getDate() + 1);
    t = next.getTime() > t ? next.getTime() : t + step;
  }

  for (const view of views) {
    const bucket = index.get(keyOf(view.createdAt));
    if (bucket) bucket.views += 1;
  }
  return buckets;
}

/* ----------------------------------------------------------------- tables */

export type PageRow = { path: string; title: string; views: number; visitors: number; avgTimeMs: number; avgScroll: number };

export function topPages(views: View[], limit = 50): PageRow[] {
  const rows = new Map<string, { title: string; views: number; visitors: Set<string>; time: number; timed: number; scroll: number }>();
  for (const view of views) {
    const path = view.path || "/";
    const row = rows.get(path) ?? { title: "", views: 0, visitors: new Set<string>(), time: 0, timed: 0, scroll: 0 };
    row.views += 1;
    if (!row.title && view.title) row.title = view.title;
    if (view.visitorId) row.visitors.add(view.visitorId);
    if (view.durationMs > 0) {
      row.time += view.durationMs;
      row.timed += 1;
    }
    row.scroll += num(view.scrollDepth);
    rows.set(path, row);
  }
  return [...rows.entries()]
    .map(([path, row]) => ({
      path,
      title: row.title,
      views: row.views,
      visitors: row.visitors.size,
      avgTimeMs: row.timed ? row.time / row.timed : 0,
      avgScroll: row.views ? row.scroll / row.views : 0,
    }))
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export type CountRow = { label: string; count: number; share: number };

function toRows(counts: Map<string, number>, total: number, limit: number): CountRow[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** First view of every session (its landing page). */
export function sessionLandings(views: View[]): View[] {
  const firsts = new Map<string, View>();
  for (const view of views) {
    const key = view.sessionId || `doc:${view.id}`;
    const existing = firsts.get(key);
    if (!existing || num(view.pageIndex) < num(existing.pageIndex) || (num(view.pageIndex) === num(existing.pageIndex) && view.createdAt < existing.createdAt)) {
      firsts.set(key, view);
    }
  }
  return [...firsts.values()];
}

/** Counts sessions by a property of their landing view. */
export function bySession(landings: View[], pick: (view: View) => string | undefined, limit = 20): CountRow[] {
  const counts = new Map<string, number>();
  for (const view of landings) {
    const label = (pick(view) || "").trim() || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return toRows(counts, landings.length, limit);
}

export function referrerHost(referrer: string | undefined): string {
  if (!referrer) return "Direct / none";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || "Direct / none";
  } catch {
    return referrer;
  }
}

export function utmLabel(view: View): string {
  if (!view.utmSource && !view.utmMedium && !view.utmCampaign) return "";
  return [view.utmSource || "-", view.utmMedium || "-", view.utmCampaign || "-"].join(" / ");
}

export type EventRow = { type: string; label: string; count: number };

export function eventSummary(events: EventDoc[], limit = 30): EventRow[] {
  const counts = new Map<string, EventRow>();
  for (const event of events) {
    const type = event.type || "unknown";
    const label = event.label || event.href || "";
    const key = `${type}\u0000${label}`;
    const row = counts.get(key) ?? { type, label, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/* ----------------------------------------------------------------- format */

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!validDate(date)) return "-";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
