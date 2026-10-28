"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildReport, formatNumber, visitorJourney, type Journey, type PageStatsRow, type Report } from "@/lib/analytics/report";
import { CONTACT_LIMITS, ID_PATTERN, LEAD_LIMITS, MAX_EXCLUDED_VISITORS, type ContactStatus, type LeadStatus } from "@/lib/firebase/schema";
import { LAUNCH_PATH } from "@/lib/site";
import { useToast } from "../kit/Toaster";
import { exportContactsCsv, exportLeadsCsv, exportPageviewsCsv } from "./exports";
import { describeError } from "./liveSource";
import { contactNotification, leadNotification, summaryNotification } from "./notify";
import { byNewest, contactStatusOf, contactToInbox, leadStatusOf, leadToInbox, timeOf } from "./records";
import {
  notificationPermission,
  requestNotificationPermission,
  showSystemNotification,
  type NotifyPermission,
} from "./systemNotify";
import { rangeOf, RANGES, type AdminSource, type AnalyticsDocs, type ContactDoc, type InboxItem, type LeadDoc, type RangeKey, type SettingsState } from "./types";

/**
 * All admin data in one React context (useAdminData()). Loads, independently:
 * - inbox: newest 1000 contacts and 1000 leads, regardless of the range; polled for new ones
 *   (toast + system notification + tab-title count), "new since your last visit" markers;
 * - analytics: page views and events of the selected range AND the previous period of equal length
 *   (at least 14 days, plus a 1 h context margin), turned into `report` = buildReport(...), plus
 *   `quick` (last 24 h and 7 days with their previous periods) for the Overview;
 * - settings/dashboard (excluded visitor ids, which every report leaves out).
 * Actions are optimistic with rollback and report failures as error toasts. A failed request with an
 * expired session signs out. The retention purge runs once per visit in the background.
 */

const MAX_INBOX = 1000;
const MAX_ANALYTICS_DOCS = 20_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MIN_WINDOW_MS = 14 * DAY;
const CONTEXT_MARGIN_MS = HOUR;
const RANGE_KEY = "bs_admin_range";
/** localStorage: time (ms) of the previous visit, to mark leads that arrived since (kept from the old dashboard). */
const LEADS_SEEN_KEY = "bs_leads_seen_at";
const CONTACTS_SEEN_KEY = "bs_contacts_seen_at";
/** More than this many arrivals in one poll become a single summary notification. */
const MAX_SINGLE_ALERTS = 3;

export type QuickPeriod = {
  report: Report;
  /** Non-spam leads created in the period and in the previous one. */
  leads: number;
  leadsPrevious: number;
  /** Non-spam contacts created in the period and in the previous one. */
  contacts: number;
  contactsPrevious: number;
};

export type QuickStats = { today: QuickPeriod; week: QuickPeriod };

export type ActionResult = { ok: true } | { ok: false; message: string };

export type JourneyResult = { ok: true; journey: Journey } | { ok: false; message: string };

export type AdminData = {
  mode: "live" | "demo";
  email: string;
  signOut: () => void;
  /** Bumps every minute so relative times ("5 min ago") stay fresh. */
  now: number;

  /* inbox */
  contacts: ContactDoc[];
  leads: LeadDoc[];
  inbox: InboxItem[];
  inboxLoaded: boolean;
  inboxLoading: boolean;
  inboxError: string | null;
  counts: {
    newContacts: number;
    newLeads: number;
    /** newContacts + newLeads (tab title, bell). */
    unread: number;
    contactsSinceLastVisit: number;
    leadsSinceLastVisit: number;
  };
  /** Time (ms) of the previous visit per source (0 = no previous visit in this browser); items created after it are "fresh". */
  lastSeen: { contacts: number; leads: number };
  /** Clears the "new since your last visit" markers (also for the next visit). */
  markSeen: () => void;
  busyIds: ReadonlySet<string>;

  /* analytics */
  range: RangeKey;
  rangeLabel: string;
  setRange: (range: RangeKey) => void;
  analytics: AnalyticsDocs | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  report: Report | null;
  /** The comparison period on its own (for the dashed previous line in timelines). */
  previousReport: Report | null;
  quick: QuickStats | null;
  /** Stats row of the landing page (LAUNCH_PATH) in the selected range. */
  landingPage: PageStatsRow | null;
  /** "page views (latest 20,000 records)" etc. when a load hit its cap. */
  truncated: string[];

  /* settings */
  settings: SettingsState;
  /** True once settings/dashboard was read successfully (a missing document counts); edits stay off until then. */
  settingsLoaded: boolean;
  /** Why the last settings read failed (the saved list is unknown until a retry succeeds). */
  settingsError: string | null;
  reloadSettings: () => Promise<void>;

  /* actions */
  setContactStatus: (id: string, status: ContactStatus) => Promise<boolean>;
  setContactNote: (id: string, note: string) => Promise<boolean>;
  setLeadStatus: (id: string, status: LeadStatus) => Promise<boolean>;
  setLeadNote: (id: string, note: string) => Promise<boolean>;
  saveExcludedVisitors: (ids: string[]) => Promise<ActionResult>;
  refresh: () => Promise<void>;
  /** Exports all loaded rows, or the given ones (e.g. the filtered table). */
  exportContacts: (rows?: readonly ContactDoc[]) => void;
  exportLeads: (rows?: readonly LeadDoc[]) => void;
  exportPageviews: () => void;
  loadJourney: (visitorId: string) => Promise<JourneyResult>;

  /* notifications */
  notifications: {
    permission: NotifyPermission;
    request: () => Promise<NotifyPermission>;
    /** Shows a sample notification built from the newest lead (or a placeholder). */
    test: () => Promise<boolean>;
  };
  /** Result of this visit's retention clean-up (null until it ran). */
  purge: { at: Date; deleted: number } | null;
  lastLoadedAt: Date | null;
};

const AdminDataContext = createContext<AdminData | null>(null);

export function useAdminData(): AdminData {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error("useAdminData() must be used inside <AdminDataProvider>");
  return value;
}

function readNumber(key: string): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the value lasts for this visit only */
  }
}

function readRange(): RangeKey {
  try {
    const stored = window.localStorage.getItem(RANGE_KEY);
    if (RANGES.some((range) => range.key === stored)) return stored as RangeKey;
  } catch {
    /* storage blocked */
  }
  return "7d";
}

function newest(docs: readonly { createdAt?: Date | null }[]): Date | null {
  let max = 0;
  for (const doc of docs) max = Math.max(max, timeOf(doc));
  return max ? new Date(max) : null;
}

function countIn<T extends { createdAt?: Date | null; status?: string }>(docs: readonly T[], from: number, to: number): number {
  let n = 0;
  for (const doc of docs) {
    const t = timeOf(doc);
    if (t >= from && t < to && doc.status !== "spam") n += 1;
  }
  return n;
}

export default function AdminDataProvider({
  source,
  email,
  onExpired,
  onSignOut,
  children,
}: {
  source: AdminSource;
  email: string;
  /** Called when a request finds the session expired. */
  onExpired: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [range, setRangeState] = useState<RangeKey>(() => (typeof window === "undefined" ? "7d" : readRange()));

  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [leads, setLeads] = useState<LeadDoc[]>([]);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsDocs | null>(null);
  const [analyticsTruncated, setAnalyticsTruncated] = useState<string[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SettingsState>({ excludedVisitors: [], updatedAt: null });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [permission, setPermission] = useState<NotifyPermission>("unsupported");
  const [purge, setPurge] = useState<{ at: Date; deleted: number } | null>(null);

  // Time of the previous visit, read once; this visit becomes the new mark.
  // The demo pretends the previous visit was two days ago so the "new since" markers can be designed.
  const [lastSeen, setLastSeen] = useState(() => {
    if (typeof window === "undefined") return { contacts: 0, leads: 0 };
    const fallback = source.mode === "demo" ? Date.now() - 2 * DAY : 0;
    return { contacts: readNumber(CONTACTS_SEEN_KEY) || fallback, leads: readNumber(LEADS_SEEN_KEY) || fallback };
  });

  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const settingsLoadedRef = useRef(settingsLoaded);
  settingsLoadedRef.current = settingsLoaded;

  /** Turns an error into a message; signs out when the session is gone. */
  const fail = useCallback((error: unknown): string | null => {
    const described = describeError(error);
    if (described.expired) {
      onExpiredRef.current();
      return null;
    }
    return described.message;
  }, []);

  /* ------------------------------------------------------------ boot effects */

  useEffect(() => {
    const at = String(Date.now());
    write(LEADS_SEEN_KEY, at);
    write(CONTACTS_SEEN_KEY, at);
    setPermission(notificationPermission());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  /* ------------------------------------------------------------------ inbox */

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    setInboxError(null);
    try {
      const data = await source.loadInbox(MAX_INBOX);
      setContacts([...data.contacts].sort(byNewest));
      setLeads([...data.leads].sort(byNewest));
      setInboxLoaded(true);
    } catch (error) {
      const message = fail(error);
      if (message) setInboxError(message);
    } finally {
      setInboxLoading(false);
    }
  }, [source, fail]);

  /* -------------------------------------------------------------- analytics */

  const analyticsRequest = useRef(0);
  const loadAnalytics = useCallback(
    async (key: RangeKey) => {
      const request = ++analyticsRequest.current;
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const span = rangeOf(key).ms;
        const until = new Date();
        const since = new Date(until.getTime() - span);
        const prevSince = new Date(since.getTime() - span);
        const loadedFrom = new Date(Math.min(prevSince.getTime(), until.getTime() - MIN_WINDOW_MS) - CONTEXT_MARGIN_MS);
        const data = await source.loadAnalytics(loadedFrom, until, MAX_ANALYTICS_DOCS);
        if (request !== analyticsRequest.current) return;
        const notes: string[] = [];
        const capped = (docs: readonly { createdAt?: Date | null }[]) => {
          // Newest first: when capped, the oldest loaded record tells whether the selected range is complete.
          let oldest = Number.POSITIVE_INFINITY;
          for (const doc of docs) {
            const t = timeOf(doc);
            if (t && t < oldest) oldest = t;
          }
          return oldest > since.getTime() ? "selected range incomplete" : "previous period incomplete";
        };
        if (data.pageviewsTruncated) notes.push(`page views (latest ${formatNumber(MAX_ANALYTICS_DOCS)} records, ${capped(data.pageviews)})`);
        if (data.eventsTruncated) notes.push(`events (latest ${formatNumber(MAX_ANALYTICS_DOCS)} records, ${capped(data.events)})`);
        setAnalyticsTruncated(notes);
        setAnalytics({ pageviews: data.pageviews, events: data.events, since, until, prevSince, loadedFrom, loadedAt: new Date() });
      } catch (error) {
        if (request !== analyticsRequest.current) return;
        const message = fail(error);
        if (message) setAnalyticsError(message);
      } finally {
        if (request === analyticsRequest.current) setAnalyticsLoading(false);
      }
    },
    [source, fail],
  );

  /* --------------------------------------------------------------- settings */

  const loadSettings = useCallback(async () => {
    setSettingsError(null);
    try {
      const data = await source.loadSettings();
      // No document yet = nothing excluded; that is a successful read.
      setSettings(data ?? { excludedVisitors: [], updatedAt: null });
      setSettingsLoaded(true);
    } catch (error) {
      // Reports still load (without exclusions), but the list stays read-only until a read succeeds,
      // so a save can never replace ids it has not seen.
      const message = fail(error);
      if (message) setSettingsError(message);
    }
  }, [source, fail]);

  useEffect(() => {
    void loadInbox();
    void loadSettings();
  }, [loadInbox, loadSettings]);

  useEffect(() => {
    void loadAnalytics(range);
  }, [loadAnalytics, range]);

  // Retention: page views and events older than RETENTION_DAYS (about 26 months, as the privacy policy
  // states) are deleted once per visit in the background; a failure is retried on the next visit.
  const purged = useRef(false);
  useEffect(() => {
    if (purged.current) return;
    purged.current = true;
    void source
      .purge()
      .then((deleted) => setPurge({ at: new Date(), deleted }))
      .catch(() => undefined);
  }, [source]);

  const setRange = useCallback((key: RangeKey) => {
    setRangeState(key);
    write(RANGE_KEY, key);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadInbox(), loadAnalytics(range), loadSettings()]);
  }, [loadInbox, loadAnalytics, loadSettings, range]);

  /* ---------------------------------------------------------------- polling */

  const announce = useCallback(
    (freshContacts: ContactDoc[], freshLeads: LeadDoc[]) => {
      for (const lead of freshLeads.slice(0, MAX_SINGLE_ALERTS)) {
        const note = leadNotification(lead);
        toast({ id: note.tag, tone: "lead", title: note.title, description: note.body.split("\n").slice(0, 2).join(" — "), action: { label: "Open lead", href: note.data.url } });
      }
      for (const contact of freshContacts.slice(0, MAX_SINGLE_ALERTS)) {
        const note = contactNotification(contact);
        toast({ id: note.tag, tone: "contact", title: note.title, description: note.body.split("\n").slice(0, 2).join(" — "), action: { label: "Open contact", href: note.data.url } });
      }
      if (notificationPermission() !== "granted") return;
      if (freshLeads.length + freshContacts.length > MAX_SINGLE_ALERTS) {
        void showSystemNotification(summaryNotification(freshLeads.length, freshContacts.length));
        return;
      }
      for (const lead of freshLeads) void showSystemNotification(leadNotification(lead));
      for (const contact of freshContacts) void showSystemNotification(contactNotification(contact));
    },
    [toast],
  );

  const polling = useRef(false);
  const lastPoll = useRef(0);
  const poll = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    lastPoll.current = Date.now();
    try {
      const page = await source.pollNew(newest(contactsRef.current), newest(leadsRef.current));
      const knownContacts = new Set(contactsRef.current.map((doc) => doc.id));
      const knownLeads = new Set(leadsRef.current.map((doc) => doc.id));
      const freshContacts = page.contacts.filter((doc) => !knownContacts.has(doc.id)).sort(byNewest);
      const freshLeads = page.leads.filter((doc) => !knownLeads.has(doc.id)).sort(byNewest);
      if (freshContacts.length) setContacts((list) => [...freshContacts, ...list.filter((doc) => !freshContacts.some((f) => f.id === doc.id))]);
      if (freshLeads.length) setLeads((list) => [...freshLeads, ...list.filter((doc) => !freshLeads.some((f) => f.id === doc.id))]);
      if (freshContacts.length || freshLeads.length) announce(freshContacts, freshLeads);
    } catch (error) {
      // A failed check is retried on the next tick; only an expired session matters here.
      if (describeError(error).expired) onExpiredRef.current();
    } finally {
      polling.current = false;
    }
  }, [source, announce]);

  useEffect(() => {
    if (!inboxLoaded) return;
    const timer = window.setInterval(() => void poll(), source.pollMs);
    // Coming back to the tab or the installed app checks at once (at most every 15 s).
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastPoll.current > 15_000) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [inboxLoaded, poll, source.pollMs]);

  /* --------------------------------------------------------------- derived */

  const counts = useMemo(() => {
    const newContacts = contacts.filter((doc) => contactStatusOf(doc) === "new").length;
    const newLeads = leads.filter((doc) => leadStatusOf(doc) === "new").length;
    return {
      newContacts,
      newLeads,
      unread: newContacts + newLeads,
      // No stored marker (first visit in this browser): nothing is "new since your last visit".
      contactsSinceLastVisit: lastSeen.contacts ? contacts.filter((doc) => timeOf(doc) > lastSeen.contacts).length : 0,
      leadsSinceLastVisit: lastSeen.leads ? leads.filter((doc) => timeOf(doc) > lastSeen.leads).length : 0,
    };
  }, [contacts, leads, lastSeen]);

  // Tab title (and the installed app's window title) shows how many enquiries wait for a reply.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = counts.unread > 0 ? `(${counts.unread}) ${base}` : base;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (counts.unread > 0) void nav.setAppBadge?.(counts.unread).catch(() => undefined);
      else void nav.clearAppBadge?.().catch(() => undefined);
    } catch {
      /* Badging API not available */
    }
  }, [counts.unread]);

  // Sign-out / expiry: drop the count from the title and from the app icon badge (shared devices).
  useEffect(
    () => () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
      try {
        void (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => undefined);
      } catch {
        /* Badging API not available */
      }
    },
    [],
  );

  const inbox = useMemo(
    () =>
      [...contacts.map((doc) => contactToInbox(doc, lastSeen.contacts)), ...leads.map((doc) => leadToInbox(doc, lastSeen.leads))].sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      ),
    [contacts, leads, lastSeen],
  );

  const excluded = useMemo(() => new Set(settings.excludedVisitors), [settings.excludedVisitors]);

  const report = useMemo(() => {
    if (!analytics) return null;
    return buildReport({
      pageviews: analytics.pageviews,
      events: analytics.events,
      contacts,
      since: analytics.since,
      until: analytics.until,
      previous: { pageviews: analytics.pageviews, events: analytics.events, contacts, since: analytics.prevSince, until: analytics.since },
      excludedVisitors: excluded,
    });
  }, [analytics, contacts, excluded]);

  const previousReport = useMemo(() => {
    if (!analytics) return null;
    return buildReport({
      pageviews: analytics.pageviews,
      events: analytics.events,
      contacts,
      since: analytics.prevSince,
      until: analytics.since,
      excludedVisitors: excluded,
    });
  }, [analytics, contacts, excluded]);

  const quick = useMemo<QuickStats | null>(() => {
    if (!analytics || !report) return null;
    const until = analytics.until.getTime();
    const period = (span: number, reuse: Report | null): QuickPeriod => {
      const since = until - span;
      const prev = since - span;
      const built =
        reuse ??
        buildReport({
          pageviews: analytics.pageviews,
          events: analytics.events,
          contacts,
          since: new Date(since),
          until: new Date(until),
          previous: { pageviews: analytics.pageviews, events: analytics.events, contacts, since: new Date(prev), until: new Date(since) },
          excludedVisitors: excluded,
        });
      return {
        report: built,
        leads: countIn(leads, since, until + 1),
        leadsPrevious: countIn(leads, prev, since),
        contacts: countIn(contacts, since, until + 1),
        contactsPrevious: countIn(contacts, prev, since),
      };
    };
    return {
      today: period(DAY, range === "24h" ? report : null),
      week: period(7 * DAY, range === "7d" ? report : null),
    };
  }, [analytics, report, contacts, leads, excluded, range]);

  const landingPage = useMemo(() => report?.pages.find((row) => row.path === LAUNCH_PATH) ?? null, [report]);

  const truncated = useMemo(() => {
    const notes = [...analyticsTruncated];
    if (contacts.length >= MAX_INBOX) notes.push(`contacts (latest ${formatNumber(MAX_INBOX)})`);
    if (leads.length >= MAX_INBOX) notes.push(`leads (latest ${formatNumber(MAX_INBOX)})`);
    return notes;
  }, [analyticsTruncated, contacts.length, leads.length]);

  /* ---------------------------------------------------------------- actions */

  const setBusyId = useCallback((id: string, on: boolean) => {
    setBusy((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const patchContact = useCallback((id: string, patch: Partial<ContactDoc>) => {
    setContacts((list) => list.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }, []);

  const patchLead = useCallback((id: string, patch: Partial<LeadDoc>) => {
    setLeads((list) => list.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }, []);

  const setContactStatus = useCallback(
    async (id: string, status: ContactStatus) => {
      const before = contactsRef.current.find((doc) => doc.id === id);
      if (!before) return false;
      setBusyId(id, true);
      patchContact(id, { status, updatedAt: new Date() });
      try {
        await source.updateContact(id, { status });
        return true;
      } catch (error) {
        patchContact(id, { status: before.status, updatedAt: before.updatedAt });
        const message = fail(error);
        if (message) toast({ tone: "error", title: "Could not update the contact", description: message });
        return false;
      } finally {
        setBusyId(id, false);
      }
    },
    [source, fail, toast, patchContact, setBusyId],
  );

  const setContactNote = useCallback(
    async (id: string, note: string) => {
      const before = contactsRef.current.find((doc) => doc.id === id);
      if (!before) return false;
      const text = note.slice(0, CONTACT_LIMITS.note);
      setBusyId(id, true);
      try {
        // The rules check the status on every update, so it is sent along unchanged.
        await source.updateContact(id, { status: contactStatusOf(before), note: text });
        patchContact(id, { note: text, updatedAt: new Date() });
        return true;
      } catch (error) {
        const message = fail(error);
        if (message) toast({ tone: "error", title: "Could not save the note", description: message });
        return false;
      } finally {
        setBusyId(id, false);
      }
    },
    [source, fail, toast, patchContact, setBusyId],
  );

  const setLeadStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      const before = leadsRef.current.find((doc) => doc.id === id);
      if (!before) return false;
      setBusyId(id, true);
      patchLead(id, { status, updatedAt: new Date() });
      try {
        await source.updateLead(id, { status });
        return true;
      } catch (error) {
        patchLead(id, { status: before.status, updatedAt: before.updatedAt });
        const message = fail(error);
        if (message) toast({ tone: "error", title: "Could not update the lead", description: message });
        return false;
      } finally {
        setBusyId(id, false);
      }
    },
    [source, fail, toast, patchLead, setBusyId],
  );

  const setLeadNote = useCallback(
    async (id: string, note: string) => {
      const before = leadsRef.current.find((doc) => doc.id === id);
      if (!before) return false;
      const text = note.slice(0, LEAD_LIMITS.note);
      setBusyId(id, true);
      try {
        await source.updateLead(id, { status: leadStatusOf(before), note: text });
        patchLead(id, { note: text, updatedAt: new Date() });
        return true;
      } catch (error) {
        const message = fail(error);
        if (message) toast({ tone: "error", title: "Could not save the note", description: message });
        return false;
      } finally {
        setBusyId(id, false);
      }
    },
    [source, fail, toast, patchLead, setBusyId],
  );

  /**
   * Saves the edited list as a change against the list it was edited from (the one in memory): the
   * stored document is read again first and only the added and removed ids are applied to it, so ids
   * saved meanwhile from another device survive. Refused until a settings read has succeeded.
   */
  const saveExcludedVisitors = useCallback(
    async (ids: string[]): Promise<ActionResult> => {
      if (!settingsLoadedRef.current) return { ok: false, message: "The saved list has not loaded yet. Reload it in Settings, then try again." };
      const list = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
      const invalid = list.filter((id) => !ID_PATTERN.test(id));
      if (invalid.length) return { ok: false, message: `Not a visitor id: ${invalid.slice(0, 3).join(", ")}. Ids are 8-64 letters, digits, - or _.` };
      const base = new Set(settingsRef.current.excludedVisitors);
      const wanted = new Set(list);
      const added = list.filter((id) => !base.has(id));
      const removed = new Set([...base].filter((id) => !wanted.has(id)));
      try {
        const stored = (await source.loadSettings())?.excludedVisitors ?? [];
        const merged = [...new Set([...added, ...stored.filter((id) => !removed.has(id))])];
        if (merged.length > MAX_EXCLUDED_VISITORS) {
          setSettings((current) => ({ ...current, excludedVisitors: stored }));
          return { ok: false, message: `At most ${MAX_EXCLUDED_VISITORS} visitor ids can be excluded (${stored.length} are saved).` };
        }
        await source.saveSettings(merged);
        setSettings({ excludedVisitors: merged, updatedAt: new Date() });
        setSettingsError(null);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: fail(error) ?? "Your session has expired." };
      }
    },
    [source, fail],
  );

  const loadJourney = useCallback(
    async (visitorId: string): Promise<JourneyResult> => {
      try {
        const docs = await source.journeyDocs(visitorId);
        return { ok: true, journey: visitorJourney(visitorId, docs) };
      } catch (error) {
        return { ok: false, message: fail(error) ?? "Your session has expired." };
      }
    },
    [source, fail],
  );

  const exportContacts = useCallback((rows?: readonly ContactDoc[]) => exportContactsCsv(rows ?? contactsRef.current), []);
  const exportLeads = useCallback((rows?: readonly LeadDoc[]) => exportLeadsCsv(rows ?? leadsRef.current), []);
  const exportPageviews = useCallback(() => {
    if (analytics) exportPageviewsCsv(analytics.pageviews, analytics.since, analytics.until, range);
  }, [analytics, range]);

  const markSeen = useCallback(() => {
    const at = Date.now();
    setLastSeen({ contacts: at, leads: at });
    // Stored too, so items cleared now are not "new since your last visit" again next time.
    write(LEADS_SEEN_KEY, String(at));
    write(CONTACTS_SEEN_KEY, String(at));
  }, []);

  const requestNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const testNotification = useCallback(async () => {
    const lead = leadsRef.current[0];
    const payload = lead
      ? leadNotification(lead)
      : leadNotification({ id: "test", kind: "plan", name: "Test enquiry", plan: "Growth", price: 79_999, currency: "INR", phone: "+91 98765 43210", email: "test@example.com" });
    const shown = await showSystemNotification({ ...payload, tag: `test-${Date.now()}` });
    if (!shown) toast({ tone: "error", title: "Notifications are blocked", description: "Allow notifications for this site in the browser settings, then try again." });
    return shown;
  }, [toast]);

  const value = useMemo<AdminData>(
    () => ({
      mode: source.mode,
      email,
      signOut: onSignOut,
      now,
      contacts,
      leads,
      inbox,
      inboxLoaded,
      inboxLoading,
      inboxError,
      counts,
      lastSeen,
      markSeen,
      busyIds: busy,
      range,
      rangeLabel: rangeOf(range).label,
      setRange,
      analytics,
      analyticsLoading,
      analyticsError,
      report,
      previousReport,
      quick,
      landingPage,
      truncated,
      settings,
      settingsLoaded,
      settingsError,
      reloadSettings: loadSettings,
      setContactStatus,
      setContactNote,
      setLeadStatus,
      setLeadNote,
      saveExcludedVisitors,
      refresh,
      exportContacts,
      exportLeads,
      exportPageviews,
      loadJourney,
      notifications: { permission, request: requestNotifications, test: testNotification },
      purge,
      lastLoadedAt: analytics?.loadedAt ?? null,
    }),
    [
      source.mode,
      email,
      onSignOut,
      now,
      contacts,
      leads,
      inbox,
      inboxLoaded,
      inboxLoading,
      inboxError,
      counts,
      lastSeen,
      markSeen,
      busy,
      range,
      setRange,
      analytics,
      analyticsLoading,
      analyticsError,
      report,
      previousReport,
      quick,
      landingPage,
      truncated,
      settings,
      settingsLoaded,
      settingsError,
      loadSettings,
      setContactStatus,
      setContactNote,
      setLeadStatus,
      setLeadNote,
      saveExcludedVisitors,
      refresh,
      exportContacts,
      exportLeads,
      exportPageviews,
      loadJourney,
      permission,
      requestNotifications,
      testNotification,
      purge,
    ],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
