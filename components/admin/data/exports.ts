import { downloadCsv, toCsv } from "@/lib/analytics/csv";
import { mergePageviews, type View } from "@/lib/analytics/report";
import type { ContactDoc, LeadDoc, PageviewDoc } from "./types";

/**
 * CSV exports (same columns as the old dashboard; contacts gain the new "note" column at the end).
 * Files are named <what>-YYYYMMDD-HHMM.csv; lib/analytics/csv guards against formula injection.
 */

export function stamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function exportLeadsCsv(leads: readonly LeadDoc[]): void {
  const csv = toCsv<LeadDoc>([...leads], [
    { header: "time", value: (l) => l.createdAt },
    { header: "status", value: (l) => l.status },
    { header: "kind", value: (l) => l.kind },
    { header: "name", value: (l) => l.name },
    { header: "email", value: (l) => l.email },
    { header: "phone", value: (l) => l.phone },
    { header: "company", value: (l) => l.company },
    { header: "contactPref", value: (l) => l.contactPref },
    { header: "plan", value: (l) => l.plan },
    { header: "currency", value: (l) => l.currency },
    { header: "price", value: (l) => l.price },
    { header: "projectTypes", value: (l) => l.projectTypes },
    { header: "features", value: (l) => l.features },
    { header: "stage", value: (l) => l.stage },
    { header: "timeline", value: (l) => l.timeline },
    { header: "budget", value: (l) => l.budget },
    { header: "message", value: (l) => l.message },
    { header: "note", value: (l) => l.note },
    { header: "utmSource", value: (l) => l.utmSource },
    { header: "utmMedium", value: (l) => l.utmMedium },
    { header: "utmCampaign", value: (l) => l.utmCampaign },
    { header: "referrer", value: (l) => l.referrer },
    { header: "language", value: (l) => l.language },
    { header: "timeZone", value: (l) => l.timeZone },
    { header: "updatedAt", value: (l) => l.updatedAt },
    { header: "id", value: (l) => l.id },
  ]);
  downloadCsv(`leads-${stamp()}.csv`, csv);
}

export function exportContactsCsv(contacts: readonly ContactDoc[]): void {
  const csv = toCsv<ContactDoc>([...contacts], [
    { header: "time", value: (c) => c.createdAt },
    { header: "status", value: (c) => c.status },
    { header: "name", value: (c) => c.name },
    { header: "email", value: (c) => c.email },
    { header: "company", value: (c) => c.company },
    { header: "phone", value: (c) => c.phone },
    { header: "service", value: (c) => c.service },
    { header: "budget", value: (c) => c.budget },
    { header: "message", value: (c) => c.message },
    { header: "page", value: (c) => c.page },
    { header: "referrer", value: (c) => c.referrer },
    { header: "language", value: (c) => c.language },
    { header: "timeZone", value: (c) => c.timeZone },
    { header: "updatedAt", value: (c) => c.updatedAt },
    { header: "id", value: (c) => c.id },
    { header: "note", value: (c) => c.note },
  ]);
  downloadCsv(`contacts-${stamp()}.csv`, csv);
}

/** Page views of [since, until) with their segments merged, newest first. */
export function exportPageviewsCsv(pageviews: readonly PageviewDoc[], since: Date, until: Date, rangeKey: string): void {
  const from = since.getTime();
  const to = until.getTime();
  const views = mergePageviews([...pageviews]).filter((view) => view.createdAt.getTime() >= from && view.createdAt.getTime() < to);
  const csv = toCsv<View>(views, [
    { header: "time", value: (v) => v.createdAt },
    { header: "path", value: (v) => v.path },
    { header: "title", value: (v) => v.title },
    { header: "durationMs", value: (v) => v.durationMs },
    { header: "scrollDepth", value: (v) => v.scrollDepth },
    { header: "pageIndex", value: (v) => v.pageIndex },
    { header: "segments", value: (v) => v.segments },
    { header: "visitorId", value: (v) => v.visitorId },
    { header: "sessionId", value: (v) => v.sessionId },
    { header: "isNewVisitor", value: (v) => v.isNewVisitor },
    { header: "referrer", value: (v) => v.referrer },
    { header: "utmSource", value: (v) => v.utmSource },
    { header: "utmMedium", value: (v) => v.utmMedium },
    { header: "utmCampaign", value: (v) => v.utmCampaign },
    { header: "device", value: (v) => v.device },
    { header: "browser", value: (v) => v.browser },
    { header: "os", value: (v) => v.os },
    { header: "language", value: (v) => v.language },
    { header: "timeZone", value: (v) => v.timeZone },
    { header: "viewportW", value: (v) => v.viewportW },
    { header: "viewportH", value: (v) => v.viewportH },
    { header: "screenW", value: (v) => v.screenW },
    { header: "screenH", value: (v) => v.screenH },
  ]);
  downloadCsv(`pageviews-${rangeKey}-${stamp()}.csv`, csv);
}
