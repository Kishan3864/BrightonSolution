"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLLECTIONS, RETENTION_DAYS, type ContactStatus, type LeadStatus } from "@/lib/firebase/schema";
import { FirestoreError, purgeOlderThan, runQuery, updateDocument } from "@/lib/firebase/firestore-admin";
import {
  bySession,
  computeKpis,
  eventSummary,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  mergePageviews,
  referrerHost,
  sessionLandings,
  timeline,
  topPages,
  utmLabel,
  type ContactDoc,
  type CountRow,
  type EventDoc,
  type EventRow,
  type PageRow,
  type PageviewDoc,
  type View,
} from "@/lib/analytics/report";
import { downloadCsv, toCsv } from "@/lib/analytics/csv";
import StatTable, { type Column } from "@/components/admin/StatTable";
import ViewsChart from "@/components/admin/ViewsChart";
import ContactsPanel from "@/components/admin/ContactsPanel";
import LeadsPanel, { type LeadDoc } from "@/components/admin/LeadsPanel";
import { AdminButton, Notice, Section, panelClass } from "@/components/admin/ui";
import Icon from "@/components/ui/Icon";
import { LAUNCH_PATH } from "@/lib/site";

const HOUR = 3600 * 1000;
const RANGES = [
  { key: "24h", label: "24 hours", ms: 24 * HOUR },
  { key: "7d", label: "7 days", ms: 7 * 24 * HOUR },
  { key: "30d", label: "30 days", ms: 30 * 24 * HOUR },
  { key: "90d", label: "90 days", ms: 90 * 24 * HOUR },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const PAGE_SIZE = 5000;
const MAX_ANALYTICS_DOCS = 10_000;
const MAX_CONTACTS = 1000;
const MAX_LEADS = 1000;
/** New landing-page leads are checked this often while the dashboard is open (one read when nothing is new). */
const LEADS_POLL_MS = 60_000;
/** localStorage: time (ms) of the previous dashboard visit, to mark leads that arrived since. */
const LEADS_SEEN_KEY = "bs_leads_seen_at";

type Data = {
  since: Date;
  until: Date;
  pageviews: PageviewDoc[];
  events: EventDoc[];
  contacts: ContactDoc[];
  leads: LeadDoc[];
  truncated: string[];
  loadedAt: Date;
};

type LeadAlert = { id: string; name: string; plan: string };

function newestLeadTime(leads: LeadDoc[]): number {
  let newest = 0;
  for (const lead of leads) {
    const at = lead.createdAt instanceof Date ? lead.createdAt.getTime() : 0;
    if (at > newest) newest = at;
  }
  return newest;
}

function readLastSeen(): number {
  try {
    const value = Number(window.localStorage.getItem(LEADS_SEEN_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(at: number) {
  try {
    window.localStorage.setItem(LEADS_SEEN_KEY, String(at));
  } catch {
    /* storage blocked: every lead stays unmarked */
  }
}

export type DashboardProps = {
  email: string;
  getToken: () => Promise<string | null>;
  onExpired: () => void;
  onSignOut: () => void;
};

/**
 * Reads up to `max` documents newest-first, paging by createdAt (Firestore REST caps one query at 5000).
 * Decoded timestamps keep only milliseconds while REQUEST_TIME has microseconds, so each next page ends
 * 1 ms after the oldest document seen and already-seen ids are skipped: nothing on a boundary is lost.
 */
async function fetchAll<T>(collection: string, since: Date, max: number, token: string) {
  const docs: T[] = [];
  const seen = new Set<string>();
  let until: Date | undefined;
  while (docs.length < max) {
    const limit = Math.min(PAGE_SIZE, max - docs.length);
    const page = await runQuery<T & { createdAt?: Date }>(collection, { since, until, limit }, token);
    let added = 0;
    for (const doc of page) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      docs.push(doc as T);
      added += 1;
    }
    if (page.length < limit) return { docs, truncated: false };
    // A page with no new ids means more than one page of documents share a millisecond: stop safely.
    if (added === 0) return { docs, truncated: true };
    const oldest = page[page.length - 1]?.createdAt;
    if (!(oldest instanceof Date)) return { docs, truncated: true };
    until = new Date(oldest.getTime() + 1);
  }
  return { docs, truncated: true };
}

function describeError(error: unknown): { message: string; expired: boolean } {
  if (error instanceof FirestoreError) {
    if (error.status === 401 || error.code === "UNAUTHENTICATED") {
      return { message: "Your session has expired. Please sign in again.", expired: true };
    }
    if (error.status === 403 || error.code === "PERMISSION_DENIED") {
      return {
        message:
          "This account is not an authorised admin. Firestore only admits support@brightonsolution.com with a verified email, signed in with a password, and the rules in firestore.rules must be deployed.",
        expired: false,
      };
    }
    if (error.code === "FAILED_PRECONDITION") {
      return { message: `Firestore needs an index or the database is not ready: ${error.message}`, expired: false };
    }
    if (error.status === 404 || error.code === "NOT_FOUND") {
      return {
        message: "The Firestore database was not found. Create it in the Firebase console (Firestore Database → Create database).",
        expired: false,
      };
    }
    return { message: error.message || "Firestore returned an error.", expired: false };
  }
  return { message: "Firestore could not be reached. Check your connection and try again.", expired: false };
}

export default function Dashboard({ email, getToken, onExpired, onSignOut }: DashboardProps) {
  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (key: RangeKey) => {
      const request = ++requestRef.current;
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          onExpired();
          return;
        }
        const span = RANGES.find((item) => item.key === key)?.ms ?? RANGES[1].ms;
        const until = new Date();
        const since = new Date(until.getTime() - span);
        const [pageviews, events, contacts, leads] = await Promise.all([
          fetchAll<PageviewDoc>(COLLECTIONS.pageviews, since, MAX_ANALYTICS_DOCS, token),
          fetchAll<EventDoc>(COLLECTIONS.events, since, MAX_ANALYTICS_DOCS, token),
          // Contacts and leads are listed regardless of range so older unanswered enquiries stay visible.
          runQuery<ContactDoc>(COLLECTIONS.contacts, { limit: MAX_CONTACTS }, token),
          runQuery<LeadDoc>(COLLECTIONS.leads, { limit: MAX_LEADS }, token),
        ]);
        if (request !== requestRef.current) return;
        const truncated: string[] = [];
        if (pageviews.truncated) truncated.push(`page views (latest ${formatNumber(MAX_ANALYTICS_DOCS)} records)`);
        if (events.truncated) truncated.push(`events (latest ${formatNumber(MAX_ANALYTICS_DOCS)} records)`);
        if (contacts.length >= MAX_CONTACTS) truncated.push(`contacts (latest ${formatNumber(MAX_CONTACTS)})`);
        if (leads.length >= MAX_LEADS) truncated.push(`leads (latest ${formatNumber(MAX_LEADS)})`);
        setData({
          since,
          until,
          pageviews: pageviews.docs,
          events: events.docs,
          contacts,
          leads,
          truncated,
          loadedAt: new Date(),
        });
      } catch (caught) {
        if (request !== requestRef.current) return;
        const described = describeError(caught);
        if (described.expired) {
          onExpired();
          return;
        }
        setError(described.message);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [getToken, onExpired],
  );

  useEffect(() => {
    void load(range);
  }, [load, range]);

  // Retention: page views and events older than RETENTION_DAYS (about 26 months, as the privacy policy
  // states) are deleted each time the dashboard is opened. Runs once per visit in the background;
  // a failure is ignored and simply retried on the next visit.
  const purgedRef = useRef(false);
  useEffect(() => {
    if (purgedRef.current) return;
    purgedRef.current = true;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * HOUR);
        await Promise.all([
          purgeOlderThan(COLLECTIONS.pageviews, cutoff, token),
          purgeOlderThan(COLLECTIONS.events, cutoff, token),
        ]);
      } catch {
        /* retried on the next visit */
      }
    })();
  }, [getToken]);

  // --------------------------------------------------------------- lead alerts

  // Time of the previous visit, read once; this visit becomes the new mark.
  const [lastSeen] = useState(() => (typeof window === "undefined" ? 0 : readLastSeen()));
  useEffect(() => {
    writeLastSeen(Date.now());
  }, []);

  const [alerts, setAlerts] = useState<LeadAlert[]>([]);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifyPermission(Notification.permission);
  }, []);

  const dataRef = useRef<Data | null>(null);
  dataRef.current = data;

  // Checks for new leads every minute and announces them (toast, tab title, desktop notification).
  // Restarts only when the dashboard first has data or the token source changes.
  const hasData = data !== null;
  useEffect(() => {
    if (!hasData) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const current = dataRef.current;
      if (!current) return;
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const newest = newestLeadTime(current.leads);
        const page = await runQuery<LeadDoc>(
          COLLECTIONS.leads,
          { since: newest ? new Date(newest) : undefined, limit: 100 },
          token,
        );
        if (cancelled) return;
        const known = new Set(current.leads.map((lead) => lead.id));
        const fresh = page.filter((lead) => !known.has(lead.id));
        if (fresh.length === 0) return;
        setData((latest) => (latest ? { ...latest, leads: [...fresh, ...latest.leads] } : latest));
        setAlerts((list) => [
          ...fresh.map((lead) => ({ id: lead.id, name: lead.name || "Someone", plan: lead.plan || "no plan picked" })),
          ...list,
        ].slice(0, 4));
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const lead of fresh.slice(0, 3)) {
            try {
              new Notification("New lead from the landing page", {
                body: `${lead.name || "Someone"}: ${lead.plan || "no plan picked"}${lead.projectTypes ? `, ${lead.projectTypes}` : ""}`,
                icon: "/icon-192.png",
                tag: `lead-${lead.id}`,
              });
            } catch {
              /* notifications blocked by the browser */
            }
          }
        }
      } catch {
        /* a failed check is simply retried on the next tick */
      }
    }, LEADS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasData, getToken]);

  const newLeads = useMemo(() => (data?.leads ?? []).filter((lead) => (lead.status ?? "new") === "new").length, [data]);
  const sinceLastVisit = useMemo(
    () => (data?.leads ?? []).filter((lead) => lead.createdAt instanceof Date && lead.createdAt.getTime() > lastSeen).length,
    [data, lastSeen],
  );

  // Tab title shows how many leads are waiting for a reply.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = newLeads > 0 ? `(${newLeads}) ${base}` : base;
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [newLeads]);

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    try {
      setNotifyPermission(await Notification.requestPermission());
    } catch {
      /* the browser refused to ask */
    }
  }, []);

  const goToLeads = useCallback(() => {
    document.getElementById("leads")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const report = useMemo(() => {
    if (!data) return null;
    const views = mergePageviews(data.pageviews);
    const contactsInRange = data.contacts.filter(
      (contact) => contact.createdAt instanceof Date && contact.createdAt >= data.since,
    );
    const landings = sessionLandings(views);
    const recentEvents = [...data.events]
      .filter((event) => event.createdAt instanceof Date)
      .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 50);
    const pages = topPages(views);
    const landingRow = pages.find((row) => row.path === LAUNCH_PATH);
    return {
      views,
      landing: { views: landingRow?.views ?? 0, visitors: landingRow?.visitors ?? 0 },
      kpis: computeKpis(views, data.events, contactsInRange),
      buckets: timeline(views, data.since, data.until),
      unit: (data.until.getTime() - data.since.getTime() <= 48 * HOUR ? "hour" : "day") as "hour" | "day",
      pages,
      referrers: bySession(landings, (view) => referrerHost(view.referrer)),
      utm: bySession(
        landings.filter((view) => utmLabel(view)),
        (view) => utmLabel(view),
      ),
      devices: bySession(landings, (view) => view.device),
      browsers: bySession(landings, (view) => view.browser),
      os: bySession(landings, (view) => view.os),
      languages: bySession(landings, (view) => view.language),
      timeZones: bySession(landings, (view) => view.timeZone),
      eventRows: eventSummary(data.events),
      recentEvents,
    };
  }, [data]);

  const setStatus = useCallback(
    async (id: string, status: ContactStatus) => {
      const before = data?.contacts.find((contact) => contact.id === id);
      if (!before) return;
      setActionError(null);
      setBusyId(id);
      const patch = (next: Partial<ContactDoc>) =>
        setData((current) =>
          current
            ? { ...current, contacts: current.contacts.map((contact) => (contact.id === id ? { ...contact, ...next } : contact)) }
            : current,
        );
      patch({ status, updatedAt: new Date() });
      try {
        const token = await getToken();
        if (!token) {
          onExpired();
          return;
        }
        await updateDocument(COLLECTIONS.contacts, id, { status }, token, ["status"], { serverTimestamp: "updatedAt" });
      } catch (caught) {
        patch({ status: before.status, updatedAt: before.updatedAt });
        const described = describeError(caught);
        if (described.expired) onExpired();
        else setActionError(described.message);
      } finally {
        setBusyId(null);
      }
    },
    [data, getToken, onExpired],
  );

  const patchLead = useCallback((id: string, next: Partial<LeadDoc>) => {
    setData((current) =>
      current ? { ...current, leads: current.leads.map((lead) => (lead.id === id ? { ...lead, ...next } : lead)) } : current,
    );
  }, []);

  const setLeadStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      const before = data?.leads.find((lead) => lead.id === id);
      if (!before) return;
      setActionError(null);
      setBusyId(id);
      patchLead(id, { status, updatedAt: new Date() });
      try {
        const token = await getToken();
        if (!token) {
          onExpired();
          return;
        }
        await updateDocument(COLLECTIONS.leads, id, { status }, token, ["status"], { serverTimestamp: "updatedAt" });
      } catch (caught) {
        patchLead(id, { status: before.status, updatedAt: before.updatedAt });
        const described = describeError(caught);
        if (described.expired) onExpired();
        else setActionError(described.message);
      } finally {
        setBusyId(null);
      }
    },
    [data, getToken, onExpired, patchLead],
  );

  const saveLeadNote = useCallback(
    async (id: string, note: string): Promise<boolean> => {
      const lead = data?.leads.find((item) => item.id === id);
      if (!lead) return false;
      try {
        const token = await getToken();
        if (!token) {
          onExpired();
          return false;
        }
        // The rules check the status on every update, so it is sent along unchanged.
        await updateDocument(
          COLLECTIONS.leads,
          id,
          { note, status: lead.status ?? "new" },
          token,
          ["note", "status"],
          { serverTimestamp: "updatedAt" },
        );
        patchLead(id, { note, updatedAt: new Date() });
        return true;
      } catch (caught) {
        const described = describeError(caught);
        if (described.expired) onExpired();
        return false;
      }
    },
    [data, getToken, onExpired, patchLead],
  );

  const exportLeads = useCallback(() => {
    if (!data) return;
    const csv = toCsv<LeadDoc>(data.leads, [
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
  }, [data]);

  const exportPageviews = useCallback(() => {
    if (!report || !data) return;
    const csv = toCsv<View>(report.views, [
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
    downloadCsv(`pageviews-${range}-${stamp()}.csv`, csv);
  }, [report, data, range]);

  const exportContacts = useCallback(() => {
    if (!data) return;
    const csv = toCsv<ContactDoc>(data.contacts, [
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
    ]);
    downloadCsv(`contacts-${stamp()}.csv`, csv);
  }, [data]);

  const k = report?.kpis;
  const kpis: { label: string; value: string; note?: string }[] = k
    ? [
        { label: "Page views", value: formatNumber(k.pageViews) },
        { label: "Unique visitors", value: formatNumber(k.visitors) },
        { label: "Sessions", value: formatNumber(k.sessions) },
        { label: "Avg. time on page", value: formatDuration(k.avgTimeMs), note: "mm:ss, visible time" },
        { label: "Pages per session", value: formatNumber(k.pagesPerSession, 1) },
        { label: "New / returning", value: `${formatNumber(k.newVisitors)} / ${formatNumber(k.returningVisitors)}` },
        { label: "Contact submissions", value: formatNumber(k.contacts) },
        { label: "Tracked clicks", value: formatNumber(k.events) },
      ]
    : [];

  const pageColumns: Column<PageRow>[] = [
    {
      header: "Page",
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block font-mono text-[0.75rem] break-all">{row.path}</span>
          {row.title ? <span className="block text-muted">{row.title}</span> : null}
        </span>
      ),
    },
    { header: "Views", numeric: true, cell: (row) => formatNumber(row.views) },
    { header: "Visitors", numeric: true, cell: (row) => formatNumber(row.visitors) },
    { header: "Avg. time", numeric: true, cell: (row) => formatDuration(row.avgTimeMs) },
    { header: "Avg. scroll", numeric: true, cell: (row) => `${Math.round(row.avgScroll)}%` },
  ];

  const countColumns = (label: string): Column<CountRow>[] => [
    { header: label, cell: (row) => row.label },
    { header: "Sessions", numeric: true, cell: (row) => formatNumber(row.count) },
    { header: "Share", numeric: true, cell: (row) => formatPercent(row.share) },
  ];

  const eventColumns: Column<EventRow>[] = [
    { header: "Type", cell: (row) => <span className="font-mono text-[0.75rem]">{row.type}</span> },
    { header: "Label", cell: (row) => row.label || "-" },
    { header: "Clicks", numeric: true, cell: (row) => formatNumber(row.count) },
  ];

  const recentColumns: Column<EventDoc>[] = [
    { header: "Time", cell: (row) => <span className="whitespace-nowrap font-mono text-[0.75rem]">{formatDateTime(row.createdAt)}</span> },
    { header: "Type", cell: (row) => <span className="font-mono text-[0.75rem]">{row.type}</span> },
    { header: "Label", cell: (row) => row.label || row.href || "-" },
    { header: "Page", cell: (row) => <span className="font-mono text-[0.75rem] break-all">{row.path}</span> },
  ];

  return (
    <div className="min-w-0">
      {/* Toolbar */}
      <div className={`mb-10 flex flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between ${panelClass}`}>
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={range === item.key}
              onClick={() => setRange(item.key)}
              className={`inline-flex min-h-[44px] items-center rounded-sharp border px-3 text-[0.8125rem] transition-colors ${
                range === item.key ? "border-accent bg-accent text-canvas" : "border-line-strong bg-surface text-fg hover:border-fg/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 min-w-0 text-[0.8125rem] text-muted break-all">
            Signed in as <span className="text-fg">{email}</span>
          </span>
          <AdminButton
            onClick={goToLeads}
            aria-label={`Leads waiting for a reply: ${newLeads}`}
            className={newLeads > 0 ? "border-accent text-accent" : ""}
          >
            <Icon name="bell" size={18} />
            <span className="font-mono tabular-nums">{newLeads}</span>
          </AdminButton>
          <AdminButton onClick={() => void load(range)} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </AdminButton>
          <AdminButton variant="primary" onClick={onSignOut}>
            Sign out
          </AdminButton>
        </div>
      </div>

      {/* New leads that arrived while the dashboard is open. */}
      <div aria-live="polite" className="fixed right-4 bottom-4 z-[70] grid w-[min(100%-2rem,22rem)] gap-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            role="status"
            className="flex items-start gap-3 rounded-[var(--radius-card)] border border-accent/60 bg-surface-2 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-canvas">
              <Icon name="bell" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] font-medium text-fg">New lead: {alert.name}</p>
              <p className="text-[0.8125rem] text-muted">{alert.plan}</p>
              <button
                type="button"
                onClick={() => {
                  goToLeads();
                  setAlerts((list) => list.filter((item) => item.id !== alert.id));
                }}
                className="mt-1 inline-flex min-h-[32px] items-center text-[0.8125rem] font-medium text-accent underline-offset-4 hover:underline"
              >
                View lead
              </button>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setAlerts((list) => list.filter((item) => item.id !== alert.id))}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-sharp text-muted hover:text-fg"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>

      <div aria-live="polite" className="mb-8 space-y-3">
        {data && sinceLastVisit > 0 ? (
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-accent/60 bg-accent/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-[0.9375rem] text-fg">
              <Icon name="bell" size={20} className="text-accent" />
              <span>
                <strong className="font-semibold">{formatNumber(sinceLastVisit)}</strong>{" "}
                {sinceLastVisit === 1 ? "new lead" : "new leads"} since your last visit.
              </span>
            </p>
            <AdminButton variant="primary" onClick={goToLeads}>
              View leads
            </AdminButton>
          </div>
        ) : null}
        {error ? (
          <Notice tone="error" title="Could not load data" role="alert">
            {error}
          </Notice>
        ) : null}
        {data && data.truncated.length ? (
          <Notice title="Partial data">
            Only the newest records were loaded for: {data.truncated.join(", ")}. Choose a shorter range for complete
            figures.
          </Notice>
        ) : null}
        {data ? (
          <p className="font-mono text-[0.75rem] text-muted">
            {formatDateTime(data.since)} – {formatDateTime(data.until)} · loaded {formatDateTime(data.loadedAt)}
          </p>
        ) : loading ? (
          <p className="text-[0.875rem] text-muted">Loading analytics…</p>
        ) : null}
      </div>

      {report ? (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          <Section
            number="01"
            title="Landing page leads"
            id="leads"
            actions={
              <>
                {notifyPermission === "default" ? (
                  <AdminButton onClick={() => void enableNotifications()}>
                    <Icon name="bell" size={16} />
                    Desktop alerts
                  </AdminButton>
                ) : null}
                <AdminButton onClick={exportLeads} disabled={!data?.leads.length}>
                  Export leads (CSV)
                </AdminButton>
              </>
            }
          >
            <LeadsPanel
              leads={data?.leads ?? []}
              landing={report.landing}
              rangeLabel={RANGES.find((item) => item.key === range)?.label ?? ""}
              since={data?.since ?? new Date()}
              lastSeen={lastSeen}
              busyId={busyId}
              onStatus={(id, status) => void setLeadStatus(id, status)}
              onNote={saveLeadNote}
            />
          </Section>

          <Section number="02" title="Overview" id="overview">
            <dl className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
              {kpis.map((item) => (
                <div key={item.label} className={`min-w-0 p-4 md:p-5 ${panelClass}`}>
                  <dt className="eyebrow eyebrow-dense text-muted">{item.label}</dt>
                  <dd className="mt-3 font-mono text-[clamp(1.25rem,1.05rem+0.8vw,1.75rem)] leading-none tracking-[-0.02em] tabular-nums break-words text-fg">
                    {item.value}
                  </dd>
                  {item.note ? <dd className="mt-2 text-[0.75rem] text-muted">{item.note}</dd> : null}
                </div>
              ))}
            </dl>
          </Section>

          <Section number="03" title={report.unit === "hour" ? "Page views by hour" : "Page views by day"} id="traffic">
            <ViewsChart buckets={report.buckets} unit={report.unit} />
          </Section>

          <Section
            number="04"
            title="Pages"
            id="pages"
            actions={
              <AdminButton onClick={exportPageviews} disabled={!report.views.length}>
                Export page views (CSV)
              </AdminButton>
            }
          >
            <StatTable caption="Top pages" columns={pageColumns} rows={report.pages} rowKey={(row) => row.path} />
          </Section>

          <Section number="05" title="Acquisition" id="acquisition">
            <div className="grid gap-10 lg:grid-cols-2">
              <StatTable
                caption="Referrers (landing page of each session)"
                captionVisible
                columns={countColumns("Source")}
                rows={report.referrers}
                rowKey={(row) => row.label}
              />
              <StatTable
                caption="Campaigns (UTM source / medium / campaign)"
                captionVisible
                columns={countColumns("Campaign")}
                rows={report.utm}
                rowKey={(row) => row.label}
                empty="No UTM-tagged visits in this range."
              />
            </div>
          </Section>

          <Section number="06" title="Audience" id="audience">
            <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
              <StatTable caption="Devices" captionVisible columns={countColumns("Device")} rows={report.devices} rowKey={(r) => r.label} />
              <StatTable caption="Browsers" captionVisible columns={countColumns("Browser")} rows={report.browsers} rowKey={(r) => r.label} />
              <StatTable caption="Operating systems" captionVisible columns={countColumns("OS")} rows={report.os} rowKey={(r) => r.label} />
              <StatTable caption="Languages" captionVisible columns={countColumns("Language")} rows={report.languages} rowKey={(r) => r.label} />
              <StatTable caption="Time zones" captionVisible columns={countColumns("Time zone")} rows={report.timeZones} rowKey={(r) => r.label} />
            </div>
          </Section>

          <Section number="07" title="Clicks and events" id="events">
            <div className="grid gap-10 xl:grid-cols-2">
              <StatTable
                caption="Most clicked"
                captionVisible
                columns={eventColumns}
                rows={report.eventRows}
                rowKey={(row) => `${row.type}:${row.label}`}
              />
              <StatTable
                caption="Recent events"
                captionVisible
                columns={recentColumns}
                rows={report.recentEvents}
                rowKey={(row) => row.id}
              />
            </div>
          </Section>

          <Section
            number="08"
            title="Contact submissions"
            id="contacts"
            actions={
              <AdminButton onClick={exportContacts} disabled={!data?.contacts.length}>
                Export contacts (CSV)
              </AdminButton>
            }
          >
            {actionError ? (
              <div className="mb-4">
                <Notice tone="error" role="alert">
                  {actionError}
                </Notice>
              </div>
            ) : null}
            <p className="mb-5 text-[0.8125rem] text-muted">
              Latest {formatNumber(MAX_CONTACTS)} submissions, newest first, regardless of the selected range.
            </p>
            <ContactsPanel contacts={data?.contacts ?? []} onStatus={(id, status) => void setStatus(id, status)} busyId={busyId} />
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
