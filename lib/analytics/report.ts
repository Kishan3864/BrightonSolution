/**
 * Analytics engine for /admin: pure, deterministic aggregation over decoded Firestore documents.
 * Admin-only (components/admin/*); never import it from public pages.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THE TRACKER WRITES (lib/analytics/tracker.ts + identity.ts). Every metric relies on this.
 * ---------------------------------------------------------------------------------------------
 * pageviews  One document per page view, written when the visitor LEAVES the page (route change,
 *            tab hidden, pagehide). createdAt = server REQUEST_TIME of that write, so it is roughly
 *            when the page was left, not when it was opened. durationMs = VISIBLE time only
 *            (< 300 ms stored as 0, capped at 6 h per document). scrollDepth = max % of the page
 *            seen. pageIndex = 1-based position of the page in its session.
 * segments   Returning to a hidden tab within the 30-minute session window continues the SAME page
 *            view: another document with the same sessionId + pageIndex (+ path), no referrer, UTM or
 *            loadMs, written only if it adds >= 1 s. Here segments are merged into one page view:
 *            time = sum (capped at 6 h), scroll = max, attributes from the earliest segment.
 * sessions   sessionId lives in sessionStorage (one per tab) and rotates after 30 minutes without
 *            activity, hidden time included. A tab resumed after that, or a click after 30 idle
 *            minutes, starts a new session at pageIndex 1 WITHOUT referrer/UTM (so: Direct).
 *            isNewVisitor = the browser's visitor id (bs_vid) was created when the session began.
 * landing    The external referrer (query-stripped) and utm_source/medium/campaign/term/content are
 *            stored only on the first page view of a fresh page load that is pageIndex 1, i.e. on the
 *            session's landing page. A session's channel and source come from that page view.
 * loadMs     Only on the first page view after a full page load (never on client-side route
 *            changes, continuation segments or pages that loaded in a background tab).
 * events     Written at once when they happen (createdAt = time of the action), max 60 per session:
 *            cta_click, outbound, play, mailto, tel, nav, form_start ("contact"), form_error
 *            ("contact:" + invalid field names), form_submit ("contact:ok" / "contact:failed").
 * contacts   Written on submit with the browser's visitorId ("" when tracking is off), userAgent,
 *            language, timeZone, page and document.referrer of the page load. The form's page view
 *            is written right after (the form navigates to /thank-you), the form_submit event too.
 * not tracked  localhost, Global Privacy Control, bots/automation, /admin, browsers marked internal.
 *
 * ---------------------------------------------------------------------------------------------
 * RANGE RULES ([since, until), all times are Date instants; buckets use `timeZone`)
 * ---------------------------------------------------------------------------------------------
 * - A page view is in the range when its FIRST segment's createdAt is. Page-view counts, the pages
 *   table, timeline, heatmap and speed use those page views.
 * - A session belongs to the range if any of its page views does. Session facts (landing page,
 *   channel, engagement, page list) use ALL of that session's documents passed in, including any
 *   just outside the range; so passing a margin of older documents (say 1 h before `since`) makes
 *   sessions that cross the start complete. Such documents are context only and never counted.
 *   A session whose landing page view is not in the data is "partial": channel Direct, source and
 *   landing "(not set)", counted in dataNotes.partialSessions.
 * - Events and enquiries count when their own createdAt is in the range.
 * - Timeline buckets are local clock hours (span <= 48 h) or local days in `timeZone`; when clocks
 *   go back, the repeated hour is one bucket that spans two hours. Page views sit in the bucket of
 *   their first segment's createdAt (when the page was left), sessions in the bucket of their first
 *   in-range page view, enquiries at their createdAt. Buckets partly outside the range are "partial".
 * - Excluded visitors (settings/dashboard) lose their page views and events before anything is
 *   computed. Their enquiries stay in `enquiries` (excluded: true) but never count.
 * - An enquiry counts (KPIs, conversions) when it is in the range, not spam and not excluded.
 *   It is matched to a session by the visitor's form_submit event within 2 minutes, else by time
 *   (the visitor's latest session that started before it, if it ended < 30 min before it).
 *
 * ---------------------------------------------------------------------------------------------
 * API
 * ---------------------------------------------------------------------------------------------
 * buildReport(input: ReportInput): Report
 *   ReportInput = { pageviews, events, contacts, since, until, previous?, excludedVisitors?, timeZone? }
 *   previous = the comparison period (same shape); you may pass the same arrays with other dates.
 *   timeZone = IANA zone for buckets and labels (default: this browser's zone, else UTC).
 *   Report = {
 *     since, until, timeZone, unit ("hour" when the span is <= 48 h, else "day"),
 *     kpis: ReportKpis       visitors (unique bs_vid with an in-range page view), newVisitors (an in-range
 *                            session flagged isNewVisitor), returningVisitors (the rest), sessions, pageviews,
 *                            avgEngagedMsPerSession, avgPagesPerSession, engagedSessions, bounceRate,
 *                            enquiries, conversionRate, medianLoadMs (see the ReportKpis comments and
 *                            DEFINITIONS; engaged = >= 10 s visible OR >= 2 page views OR a successful
 *                            form_submit / non-spam enquiry in the session). Each Kpi = { value,
 *                            previous: number | null, change: number | null, kind, measured }.
 *                            change is relative (0.25 = +25 %) for counts/durations/averages and an
 *                            absolute difference for kind "rate" (0.05 = +5 points). measured=false
 *                            means nothing to measure (no sessions, no load samples): show a dash.
 *     timeline: TimelineBucket[]     { key, start, end, label, longLabel, partial, views, visitors,
 *                                      sessions (by first page view in range), enquiries }
 *     channels: ChannelRow[]         { channel, share } + SessionMetrics
 *     sources: SourceRow[]           { source, channel, share } + SessionMetrics
 *     campaigns: CampaignRow[]       { utmSource, utmMedium, utmCampaign, utmTerm, utmContent, channel }
 *                                    + SessionMetrics (sessions that landed with any UTM tag)
 *     landingPages: LandingPageRow[] { path, title, share } + SessionMetrics ("(not set)" = partial)
 *       SessionMetrics = { sessions, visitors, engagedSessions, engagedRate, bounceRate, enquiries,
 *                          convertedSessions, conversionRate, pageviews, avgEngagedMs (per session) }
 *     pages: PageStatsRow[]          { path, title, views, visitors, sessions, entries, exits,
 *                                      totalEngagedMs, avgEngagedMs (per view), avgScroll | null,
 *                                      bounceRate | null (sessions that entered here), exitRate }
 *     sessions: SessionDetail[]      newest first; pages (SessionPage) and events (SessionEvent) of
 *                                    the whole session; enquiryIds of matched contacts
 *     visitors: VisitorRow[]         visitors with a session in range, most recent first
 *     audience: Audience             countries, languages, devices, browsers, os, screens, timeZones,
 *                                    newVsReturning: BreakdownRow[] ({ key, label, share } + SessionMetrics)
 *     heatmap: Heatmap               page views by weekday (Mon first) x hour, in timeZone
 *     behaviour: Behaviour           eventTotals, ctaClicks, outboundClicks, playClicks, navClicks,
 *                                    contactClicks, mailtoClicks, telClicks, formFunnel, scrollDistribution
 *     speed: Speed                   overall, byDevice, byLandingPage: { samples, medianMs, p75Ms }
 *     enquiries: EnquiryDetail[]     EVERY contact passed in (newest first), enriched; inRange/counted flags
 *     dataNotes: DataNotes           document counts, exclusions, merged segments, partial sessions ...
 *   }
 * visitorJourney(visitorId, { pageviews, events, contacts }): Journey
 *   The full history of one visitor (fetch it with queryWhereEquals(..., "visitorId", id)).
 * DEFINITIONS                        Plain-English definitions for the UI (keyed like the metrics).
 * SCROLL_BUCKETS, WEEKDAYS, ENGAGED_MIN_MS, ENGAGED_MIN_PAGES
 * Formatting: formatDuration, formatNumber, formatPercent, formatChange, formatDateTime(date, timeZone?)
 * Helpers: mergePageviews (segments -> View[]), quantile
 * Legacy (deprecated, kept until components/admin/* moves to buildReport): computeKpis, timeline,
 *   topPages, sessionLandings, bySession, referrerHost, utmLabel, eventSummary and their types.
 */

import {
  PAGEVIEW_LIMITS,
  type ContactRecord,
  type ContactStatus,
  type DeviceType,
  type EventRecord,
  type PageviewRecord,
} from "@/lib/firebase/schema";
import { classifyChannel, type Channel } from "@/lib/analytics/channels";
import { countryFromTimeZone, type Country } from "@/lib/analytics/geo";
import { parseUserAgent } from "@/lib/analytics/ua";

/* =================================================================================== inputs */

export type WithMeta<T> = Partial<T> & { id: string; createdAt?: Date | null; updatedAt?: Date | null };

/** Page-view fields added in October 2026; older documents lack them. */
type PageviewExtras = { utmTerm?: string; utmContent?: string; loadMs?: number };

export type PageviewDoc = WithMeta<PageviewRecord & PageviewExtras>;
/** `type` is a plain string so documents with types this build does not know still load. */
export type EventDoc = WithMeta<Omit<EventRecord, "type"> & { type: string }>;
export type ContactDoc = WithMeta<ContactRecord>;

export type ReportPeriod = {
  pageviews: readonly PageviewDoc[];
  events: readonly EventDoc[];
  contacts: readonly ContactDoc[];
  since: Date;
  until: Date;
};

export type ReportInput = ReportPeriod & {
  /** Comparison period for the KPI changes. */
  previous?: ReportPeriod;
  /** Visitor ids (bs_vid) of the team's own browsers. */
  excludedVisitors?: ReadonlySet<string>;
  /** IANA time zone for buckets and labels; default this browser's zone (UTC if unknown). */
  timeZone?: string;
};

/* ================================================================================== outputs */

export type KpiKind = "count" | "duration" | "average" | "rate";

export type Kpi = {
  value: number;
  /** Same metric in the comparison period; null without one (or when it measured nothing). */
  previous: number | null;
  /** Relative change for counts, durations and averages; difference in rate units for "rate". */
  change: number | null;
  kind: KpiKind;
  /** False when there was nothing to measure (no sessions, no load samples): show a dash, not 0. */
  measured: boolean;
};

export type ReportKpis = {
  visitors: Kpi;
  newVisitors: Kpi;
  returningVisitors: Kpi;
  sessions: Kpi;
  pageviews: Kpi;
  /** Visible time of in-range page views / sessions (ms). */
  avgEngagedMsPerSession: Kpi;
  /** In-range page views / sessions. */
  avgPagesPerSession: Kpi;
  engagedSessions: Kpi;
  /** 1 - engaged sessions / sessions (0..1). */
  bounceRate: Kpi;
  enquiries: Kpi;
  /** Sessions with a counted enquiry / sessions (0..1). */
  conversionRate: Kpi;
  /** Median page load time (ms) of in-range page views that measured one. */
  medianLoadMs: Kpi;
};

export type KpiKey = keyof ReportKpis;

export type TimelineBucket = {
  /** "2026-10-09" (day) or "2026-10-09T14" (hour), in the report's time zone. */
  key: string;
  start: Date;
  end: Date;
  /** "9 Oct" or "14:00". */
  label: string;
  /** "Fri 9 Oct 2026" or "Fri 9 Oct, 14:00-15:00". */
  longLabel: string;
  /** The bucket starts before `since` or ends after `until`. */
  partial: boolean;
  views: number;
  /** Unique visitors with a page view in this bucket (buckets do not add up to the total). */
  visitors: number;
  /** Sessions counted in the bucket of their first in-range page view (buckets add up). */
  sessions: number;
  enquiries: number;
};

/** Session-based metrics shared by every breakdown row. Rates are 0..1. */
export type SessionMetrics = {
  sessions: number;
  visitors: number;
  engagedSessions: number;
  engagedRate: number;
  bounceRate: number;
  /** Counted enquiries matched to these sessions. */
  enquiries: number;
  convertedSessions: number;
  conversionRate: number;
  /** In-range page views of these sessions. */
  pageviews: number;
  /** In-range visible time per session (ms). */
  avgEngagedMs: number;
};

export type ChannelRow = SessionMetrics & { channel: Channel; share: number };
export type SourceRow = SessionMetrics & { source: string; channel: Channel; share: number };
export type CampaignRow = SessionMetrics & {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  channel: Channel;
};
export type LandingPageRow = SessionMetrics & { path: string; title: string; share: number };
export type BreakdownRow = SessionMetrics & { key: string; label: string; share: number };

export type PageStatsRow = {
  path: string;
  title: string;
  views: number;
  visitors: number;
  sessions: number;
  /** Page views that started their session (landing). */
  entries: number;
  /** Page views that were the last of their session. */
  exits: number;
  totalEngagedMs: number;
  /** Visible time per view (ms). */
  avgEngagedMs: number;
  /** Mean max scroll %; null when no view recorded it. */
  avgScroll: number | null;
  /** Of the sessions that entered on this page, the share that was not engaged; null without entries. */
  bounceRate: number | null;
  /** exits / views. */
  exitRate: number;
};

export type SessionPage = {
  pageIndex: number;
  path: string;
  title: string;
  /** Estimated time the page was opened: createdAt of its first segment minus its visible time. */
  at: Date;
  /** When the page was last left (createdAt of its last segment). */
  leftAt: Date;
  durationMs: number;
  scrollDepth: number | null;
  segments: number;
  loadMs: number | null;
  inRange: boolean;
};

export type SessionEvent = { id: string; type: string; label: string; href: string; path: string; at: Date };

export type SessionDetail = {
  id: string;
  visitorId: string;
  /** Earliest of (page view createdAt - durationMs) and event times. */
  start: Date;
  /** Latest page view createdAt or event time. */
  end: Date;
  inRange: boolean;
  landing: string;
  landingTitle: string;
  /** False when the session's first page view is not in the loaded data (began earlier). */
  landingInData: boolean;
  exit: string;
  pageCount: number;
  engagedMs: number;
  engaged: boolean;
  channel: Channel;
  source: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  device: DeviceType | null;
  browser: string;
  os: string;
  /** "1920x1080", "" when unknown. */
  screen: string;
  viewport: string;
  country: Country | null;
  timeZone: string;
  language: string;
  isNewVisitor: boolean;
  /** 1-based visit number when the visitor's first visit is in the loaded data, else null. */
  visitNumber: number | null;
  loadMs: number | null;
  /** A successful form_submit happened in the session. */
  submitted: boolean;
  pages: SessionPage[];
  events: SessionEvent[];
  enquiryIds: string[];
};

export type VisitorRow = {
  id: string;
  firstSeen: Date;
  lastSeen: Date;
  /** The first visit ever (isNewVisitor) is in the loaded data, so firstSeen is exact. */
  historyComplete: boolean;
  /** First-ever visit falls in the range. */
  isNew: boolean;
  /** In-range sessions, page views and visible time. */
  sessions: number;
  pageviews: number;
  engagedMs: number;
  firstChannel: Channel;
  firstSource: string;
  firstLanding: string;
  country: Country | null;
  device: DeviceType | null;
  browser: string;
  os: string;
  /** Contacts sent from this browser (any time, any status), oldest first. */
  enquiryIds: string[];
  /** In-range sessions, newest first. */
  sessionIds: string[];
};

export type Audience = {
  countries: BreakdownRow[];
  languages: BreakdownRow[];
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  os: BreakdownRow[];
  screens: BreakdownRow[];
  timeZones: BreakdownRow[];
  newVsReturning: BreakdownRow[];
};

export type Heatmap = {
  /** Monday first. */
  days: readonly string[];
  /** cells[day][hour] = page views (day 0 = Monday, hour 0-23 in the report's time zone). */
  cells: number[][];
  max: number;
  total: number;
};

export type ClickRow = {
  label: string;
  /** Most frequent href for this label. */
  href: string;
  /** Page where it was clicked most often. */
  path: string;
  clicks: number;
  sessions: number;
  visitors: number;
};

export type EventTotalRow = { type: string; events: number; sessions: number; visitors: number };

export type FormFunnel = {
  /** In-range sessions that viewed /contact. */
  contactPageSessions: number;
  /** In-range sessions with a form_start event. */
  formStarts: number;
  /** In-range sessions where validation blocked a submit (form_error). */
  formErrors: number;
  /** In-range sessions with a successful form_submit. */
  submissions: number;
  /** In-range form_submit events that failed to save. */
  failedSubmissions: number;
  /** Counted enquiries in range (same as the KPI). */
  enquiries: number;
  /** Invalid fields reported by form_error events in range. */
  errorFields: { field: string; count: number }[];
};

export type ScrollRow = {
  path: string;
  views: number;
  /** Views that recorded a scroll depth. */
  measured: number;
  /** Views in SCROLL_BUCKETS: 0-25, 25-50, 50-75, 75-100 %. */
  buckets: [number, number, number, number];
  avgScroll: number | null;
};

export type Behaviour = {
  eventTotals: EventTotalRow[];
  ctaClicks: ClickRow[];
  outboundClicks: ClickRow[];
  playClicks: ClickRow[];
  navClicks: ClickRow[];
  /** mailto and tel clicks by label. */
  contactClicks: (ClickRow & { type: "mailto" | "tel" })[];
  mailtoClicks: number;
  telClicks: number;
  formFunnel: FormFunnel;
  /** The 10 most viewed pages. */
  scrollDistribution: ScrollRow[];
};

export type SpeedRow = { key: string; label: string; samples: number; medianMs: number | null; p75Ms: number | null };

export type Speed = {
  overall: SpeedRow;
  byDevice: SpeedRow[];
  /** By the page that was loaded in full (almost always the session's landing page). */
  byLandingPage: SpeedRow[];
};

export type EnquiryDetail = {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  status: ContactStatus;
  name: string;
  company: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  message: string;
  page: string;
  referrer: string;
  userAgent: string;
  language: string;
  timeZone: string;
  visitorId: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: DeviceType | null;
  country: Country | null;
  inRange: boolean;
  /** inRange && not spam && not excluded: counts in KPIs and conversions. */
  counted: boolean;
  /** Sent from a browser on the excluded list. */
  excluded: boolean;
  /**
   * "visitor": first touch from the visitor's earliest session in the loaded data;
   * "referrer": no tracked sessions, so the contact's own page-load referrer was classified;
   * "none": nothing known.
   */
  attribution: "visitor" | "referrer" | "none";
  /** First-touch channel and source (see attribution). */
  channel: Channel | null;
  source: string | null;
  firstLanding: string | null;
  firstSeen: Date | null;
  historyComplete: boolean;
  /** The session the enquiry was sent from, when matched. */
  sessionId: string | null;
  matchedBy: "event" | "time" | null;
  sessionChannel: Channel | null;
  sessionSource: string | null;
  sessionLanding: string | null;
  /** Visitor's sessions that started before the enquiry, including the one it was sent from. */
  sessionsBeforeEnquiry: number | null;
  /** Visitor's page views opened before the enquiry (the form page included). */
  pagesBeforeEnquiry: number | null;
  /** From first seen to the enquiry (ms). */
  timeToEnquiryMs: number | null;
  /** Sessions of this visitor in the loaded data. */
  visitorSessions: number;
};

export type DataNotes = {
  pageviewDocs: number;
  eventDocs: number;
  contactDocs: number;
  /** Merged page views in range (after exclusions). */
  pageviewsInRange: number;
  eventsInRange: number;
  contactsInRange: number;
  /** In-range page views / events / enquiries of excluded visitors (left out). */
  excludedPageviews: number;
  excludedEvents: number;
  excludedEnquiries: number;
  /** Segment documents folded into an earlier segment of the same in-range page view. */
  mergedSegments: number;
  /** Documents without a readable createdAt (ignored). */
  invalidDocs: number;
  /** Page views outside the range used only to complete sessions that cross its edges. */
  contextPageviews: number;
  /** In-range sessions whose landing page view is not in the data (began before the loaded data). */
  partialSessions: number;
  /** In-range events whose session has no page view in the data (not attached to a session). */
  orphanEvents: number;
  /** Counted enquiries that could not be matched to a session. */
  unmatchedEnquiries: number;
  /** Enquiries in range marked as spam (not counted). */
  spamEnquiries: number;
  /** In-range page views without pageIndex (older format; cannot be merged or ordered exactly). */
  legacyPageviews: number;
};

export type Report = {
  since: Date;
  until: Date;
  timeZone: string;
  unit: "hour" | "day";
  kpis: ReportKpis;
  timeline: TimelineBucket[];
  channels: ChannelRow[];
  sources: SourceRow[];
  campaigns: CampaignRow[];
  landingPages: LandingPageRow[];
  pages: PageStatsRow[];
  sessions: SessionDetail[];
  visitors: VisitorRow[];
  audience: Audience;
  heatmap: Heatmap;
  behaviour: Behaviour;
  speed: Speed;
  enquiries: EnquiryDetail[];
  dataNotes: DataNotes;
};

export type JourneyTouch = {
  channel: Channel;
  source: string;
  referrer: string;
  landing: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  at: Date;
};

export type Journey = {
  visitorId: string;
  /** Any page view, event or contact found for this visitor. */
  found: boolean;
  firstSeen: Date | null;
  lastSeen: Date | null;
  /** The first-ever visit is part of the data (otherwise it is older than the retention period). */
  historyComplete: boolean;
  /** Channel and source of the first session. */
  firstTouch: JourneyTouch | null;
  totals: {
    sessions: number;
    engagedSessions: number;
    pageviews: number;
    engagedMs: number;
    events: number;
    enquiries: number;
  };
  /** From the most recent session. */
  country: Country | null;
  device: DeviceType | null;
  browser: string;
  os: string;
  language: string;
  timeZone: string;
  screen: string;
  /** Oldest first. */
  sessions: SessionDetail[];
  /** Oldest first. */
  enquiries: EnquiryDetail[];
};

/* ============================================================================== definitions */

export const ENGAGED_MIN_MS = 10_000;
export const ENGAGED_MIN_PAGES = 2;
export const SCROLL_BUCKETS = ["0-25%", "25-50%", "50-75%", "75-100%"] as const;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Short plain-English definitions for tooltips and the dashboard's notes. */
export const DEFINITIONS = {
  visitor:
    "A unique browser, recognised by an anonymous random id stored in it (bs_vid). The same person on another device, or after clearing site data, counts again.",
  newVisitor: "A visitor whose first-ever visit falls in this period.",
  returningVisitor: "A visitor who first visited before this period.",
  session:
    "One visit: the pages a visitor views in one tab until 30 minutes pass without activity. Coming back after that starts a new session.",
  pageview:
    "One page shown to a visitor. When someone leaves a tab and returns to it, the parts are merged so the page view counts once.",
  engagedSession:
    "A session with at least 10 seconds of on-screen time, two or more page views, or a sent enquiry.",
  bounceRate: "The share of sessions that were not engaged (1 minus engaged sessions divided by sessions).",
  engagedTime:
    "Time the page was actually on screen. Time in a hidden or background tab is not counted, and a single page view counts at most 6 hours.",
  avgEngagedTime: "Total on-screen time divided by the number of sessions.",
  pagesPerSession: "Page views divided by sessions.",
  enquiry:
    "A contact-form submission. Enquiries marked as spam, or sent from an excluded browser, are listed but not counted.",
  conversionRate: "The share of sessions in which a counted enquiry was sent.",
  channel:
    "Where a session came from, read from its first page: the referring site and any UTM tags. Search, AI assistants, social, email, paid, campaign, referral or direct.",
  source: "The utm_source tag when the link had one, otherwise the referring site (without www.); (direct) when there was neither.",
  landingPage: "The first page of a session.",
  entries: "Page views that started a session.",
  exits: "Page views that ended a session.",
  exitRate: "Exits divided by page views of that page.",
  scrollDepth: "How far down the page the visitor saw, as a percentage of its height.",
  loadTime:
    "Time from opening a page until it finished loading, measured on the first page shown after the site is opened or reloaded. Median: half the loads were faster. p75: three quarters were faster.",
  country:
    "Estimated from the time zone set on the visitor's device (no IP address is stored). Travellers and VPN users can show up elsewhere.",
  times: "Times are shown in your local time zone. A page view is recorded when the visitor leaves the page.",
  firstTouch: "The channel and source of the visitor's first visit that is in the loaded data.",
  sessionsBeforeEnquiry: "Visits up to and including the one in which the enquiry was sent.",
  pagesBeforeEnquiry: "Pages the visitor opened before sending the enquiry, the form page included.",
  timeToEnquiry: "Time from the visitor's first visit to the enquiry.",
  formFunnel:
    "Sessions that viewed the contact page, started filling in the form, hit a validation error and sent it successfully.",
  excludedVisitors: "Your team's own browsers. Their visits and clicks are left out of every figure.",
  partialSession:
    "A session that began before the loaded data, so its first page and source are unknown (shown as (not set)).",
} as const;

export type DefinitionKey = keyof typeof DEFINITIONS;

/* ================================================================================ internals */

const MAX_DURATION_MS = PAGEVIEW_LIMITS.durationMs[1];
const MAX_LOAD_MS = 120_000;
const SESSION_IDLE_MS = 30 * 60_000;
const SUBMIT_MATCH_MS = 2 * 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const SLOT_MS = 900_000;
const HOURLY_MAX_SPAN_MS = 48 * HOUR_MS;
const CONTACT_PATH = /^\/contact\/?$/;
const NOT_SET = "(not set)";
const UNKNOWN = "Unknown";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function timeOf(value: unknown): number | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.getTime() : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOf(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clampDuration(value: unknown): number {
  const n = numberOf(value);
  if (n === null || n <= 0) return 0;
  return Math.min(MAX_DURATION_MS, Math.round(n));
}

function scrollOf(value: unknown): number | null {
  const n = numberOf(value);
  return n === null ? null : Math.max(0, Math.min(100, n));
}

function loadOf(value: unknown): number | null {
  const n = numberOf(value);
  return n === null || n < 0 || n > MAX_LOAD_MS ? null : Math.round(n);
}

function positiveInt(value: unknown): number {
  const n = numberOf(value);
  return n !== null && n >= 1 ? Math.floor(n) : 0;
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sizeLabel(w: number | null, h: number | null): string {
  return w && h && w > 0 && h > 0 ? `${w}x${h}` : "";
}

function deviceOf(value: unknown): DeviceType | null {
  return value === "mobile" || value === "tablet" || value === "desktop" ? value : null;
}

function statusOf(value: unknown): ContactStatus {
  return value === "handled" || value === "spam" ? value : "new";
}

const languageCache = new Map<string, string>();

/** Language tag with canonical case: "en-in" -> "en-IN". */
function normalizeLanguage(value: string): string {
  if (!value) return "";
  const cached = languageCache.get(value);
  if (cached !== undefined) return cached;
  const normalized = value
    .replace(/_/g, "-")
    .split("-")
    .map((part, i) => {
      if (i === 0) return part.toLowerCase();
      if (part.length === 2) return part.toUpperCase();
      if (part.length === 4) return part[0].toUpperCase() + part.slice(1).toLowerCase();
      return part;
    })
    .join("-");
  if (languageCache.size < 500) languageCache.set(value, normalized);
  return normalized;
}

/** Successful form submission (labels end in ":failed" when saving failed). */
function isSubmitOk(event: MEvent): boolean {
  return event.type === "form_submit" && !/:failed$/i.test(event.label);
}

function isSubmitFailed(event: MEvent): boolean {
  return event.type === "form_submit" && /:failed$/i.test(event.label);
}

/** Linear-interpolated quantile (q in 0..1) of numbers; null for an empty list. */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.max(0, Math.min(1, q)) * (sorted.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
}

/* --------------------------------------------------------------------------- time zones */

function resolveTimeZone(requested?: string): string {
  const candidates = [requested, safeLocalZone(), "UTC"];
  for (const zone of candidates) {
    if (!zone) continue;
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
    } catch {
      /* invalid zone: try the next */
    }
  }
  return "UTC";
}

function safeLocalZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

/**
 * Wall-clock parts of instants in one IANA zone. Offsets are cached per UTC day and, on the rare
 * days with a transition, per 15-minute slot (every real offset change falls on a slot boundary).
 */
class ZoneClock {
  readonly timeZone: string;
  private readonly format: Intl.DateTimeFormat;
  private readonly days = new Map<number, number | Map<number, number>>();

  constructor(timeZone: string) {
    this.timeZone = timeZone;
    this.format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  }

  private measure(t: number): number {
    let year = 1970;
    let month = 1;
    let day = 1;
    let hour = 0;
    let minute = 0;
    let second = 0;
    for (const part of this.format.formatToParts(new Date(t))) {
      const value = Number(part.value);
      if (part.type === "year") year = value;
      else if (part.type === "month") month = value;
      else if (part.type === "day") day = value;
      else if (part.type === "hour") hour = value === 24 ? 0 : value;
      else if (part.type === "minute") minute = value;
      else if (part.type === "second") second = value;
    }
    return Date.UTC(year, month - 1, day, hour, minute, second) - Math.floor(t / 1000) * 1000;
  }

  offset(t: number): number {
    const dayIndex = Math.floor(t / DAY_MS);
    let entry = this.days.get(dayIndex);
    if (entry === undefined) {
      const first = this.measure(dayIndex * DAY_MS);
      const last = this.measure(dayIndex * DAY_MS + DAY_MS - SLOT_MS);
      entry = first === last ? first : new Map<number, number>();
      this.days.set(dayIndex, entry);
    }
    if (typeof entry === "number") return entry;
    const slot = Math.floor(t / SLOT_MS);
    let value = entry.get(slot);
    if (value === undefined) {
      value = this.measure(slot * SLOT_MS);
      entry.set(slot, value);
    }
    return value;
  }

  parts(t: number): LocalParts {
    const local = new Date(t + this.offset(t));
    return {
      year: local.getUTCFullYear(),
      month: local.getUTCMonth(),
      day: local.getUTCDate(),
      hour: local.getUTCHours(),
      minute: local.getUTCMinutes(),
      weekday: local.getUTCDay(),
    };
  }

  dayKey(t: number): string {
    const p = this.parts(t);
    return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  }

  hourKey(t: number): string {
    const p = this.parts(t);
    return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}`;
  }
}

/* ------------------------------------------------------------------------- page views */

type MView = {
  /** The earliest segment document. */
  doc: PageviewDoc;
  id: string;
  visitorId: string;
  sessionKey: string;
  path: string;
  title: string;
  pageIndex: number;
  firstAt: number;
  lastAt: number;
  startAt: number;
  durationMs: number;
  scroll: number | null;
  segments: number;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  device: DeviceType | null;
  browser: string;
  os: string;
  language: string;
  timeZone: string;
  screenW: number | null;
  screenH: number | null;
  viewportW: number | null;
  viewportH: number | null;
  isNewVisitor: boolean | null;
  loadMs: number | null;
  inRange: boolean;
};

function viewFromDoc(doc: PageviewDoc, at: number, durationMs: number): MView {
  const sessionId = str(doc.sessionId);
  return {
    doc,
    id: doc.id,
    visitorId: str(doc.visitorId) || `unknown-${sessionId || doc.id}`,
    sessionKey: sessionId || `doc-${doc.id}`,
    path: str(doc.path) || "/",
    title: str(doc.title),
    pageIndex: positiveInt(doc.pageIndex),
    firstAt: at,
    lastAt: at,
    startAt: at - durationMs,
    durationMs,
    scroll: scrollOf(doc.scrollDepth),
    segments: 1,
    referrer: str(doc.referrer),
    utmSource: str(doc.utmSource),
    utmMedium: str(doc.utmMedium),
    utmCampaign: str(doc.utmCampaign),
    utmTerm: str(doc.utmTerm),
    utmContent: str(doc.utmContent),
    device: deviceOf(doc.device),
    browser: str(doc.browser),
    os: str(doc.os),
    language: normalizeLanguage(str(doc.language)),
    timeZone: str(doc.timeZone),
    screenW: numberOf(doc.screenW),
    screenH: numberOf(doc.screenH),
    viewportW: numberOf(doc.viewportW),
    viewportH: numberOf(doc.viewportH),
    isNewVisitor: typeof doc.isNewVisitor === "boolean" ? doc.isNewVisitor : null,
    loadMs: loadOf(doc.loadMs),
    inRange: false,
  };
}

/** Folds a later segment into its page view: time adds up, scroll is the max, gaps are filled. */
function foldSegment(view: MView, doc: PageviewDoc, at: number, durationMs: number): void {
  const next = viewFromDoc(doc, at, durationMs);
  view.durationMs = Math.min(MAX_DURATION_MS, view.durationMs + durationMs);
  if (next.scroll !== null) view.scroll = view.scroll === null ? next.scroll : Math.max(view.scroll, next.scroll);
  view.lastAt = Math.max(view.lastAt, at);
  view.startAt = Math.min(view.startAt, next.startAt);
  view.segments += 1;
  if (!view.title) view.title = next.title;
  if (!view.referrer) view.referrer = next.referrer;
  if (!view.utmSource && !view.utmMedium && !view.utmCampaign) {
    view.utmSource = next.utmSource;
    view.utmMedium = next.utmMedium;
    view.utmCampaign = next.utmCampaign;
    view.utmTerm = next.utmTerm;
    view.utmContent = next.utmContent;
  }
  if (view.device === null) view.device = next.device;
  if (!view.browser) view.browser = next.browser;
  if (!view.os) view.os = next.os;
  if (!view.language) view.language = next.language;
  if (!view.timeZone) view.timeZone = next.timeZone;
  if (view.screenW === null) view.screenW = next.screenW;
  if (view.screenH === null) view.screenH = next.screenH;
  if (view.viewportW === null) view.viewportW = next.viewportW;
  if (view.viewportH === null) view.viewportH = next.viewportH;
  if (view.isNewVisitor === null) view.isNewVisitor = next.isNewVisitor;
  if (view.loadMs === null) view.loadMs = next.loadMs;
}

/**
 * Merges page-view documents into page views. Key: sessionId + pageIndex + path (path guards
 * against the rare pageIndex collision of duplicated tabs); documents without a pageIndex stay
 * single page views. Returns them oldest first.
 */
function mergeViews(docs: readonly PageviewDoc[]): { views: MView[]; invalid: number } {
  const timed: { doc: PageviewDoc; at: number }[] = [];
  let invalid = 0;
  for (const doc of docs) {
    const at = timeOf(doc.createdAt);
    if (at === null || !doc.id) {
      invalid += 1;
      continue;
    }
    timed.push({ doc, at });
  }
  timed.sort((a, b) => a.at - b.at || compareText(a.doc.id, b.doc.id));

  const byKey = new Map<string, MView>();
  const views: MView[] = [];
  for (const { doc, at } of timed) {
    const sessionId = str(doc.sessionId);
    const pageIndex = positiveInt(doc.pageIndex);
    const path = str(doc.path) || "/";
    const key = sessionId && pageIndex > 0 ? `${sessionId}\u0000${pageIndex}\u0000${path}` : `doc\u0000${doc.id}`;
    const durationMs = clampDuration(doc.durationMs);
    const existing = byKey.get(key);
    if (existing) {
      foldSegment(existing, doc, at, durationMs);
      continue;
    }
    const view = viewFromDoc(doc, at, durationMs);
    byKey.set(key, view);
    views.push(view);
  }
  return { views, invalid };
}

/* ------------------------------------------------------------------- events, contacts */

type MEvent = {
  id: string;
  visitorId: string;
  sessionId: string;
  type: string;
  label: string;
  href: string;
  path: string;
  at: number;
  inRange: boolean;
};

type MContact = {
  doc: ContactDoc;
  id: string;
  at: number | null;
  visitorId: string;
  status: ContactStatus;
  inRange: boolean;
  excluded: boolean;
  spam: boolean;
  counted: boolean;
  session: MSession | null;
  matchedBy: "event" | "time" | null;
};

/* ---------------------------------------------------------------------------- sessions */

type MSession = {
  key: string;
  visitorId: string;
  views: MView[];
  events: MEvent[];
  contacts: MContact[];
  start: number;
  end: number;
  landing: MView;
  exit: MView;
  landingInData: boolean;
  channel: Channel;
  source: string;
  engagedMs: number;
  submitted: boolean;
  engaged: boolean;
  isNewVisitor: boolean;
  country: Country | null;
  device: DeviceType | null;
  browser: string;
  os: string;
  language: string;
  timeZone: string;
  screen: string;
  viewport: string;
  inRange: boolean;
  /** firstAt of the earliest in-range page view. */
  firstInRangeAt: number;
  rangeViews: number;
  rangeEngagedMs: number;
  countedEnquiries: number;
  visitNumber: number | null;
};

function compareViews(a: MView, b: MView): number {
  const ai = a.pageIndex > 0 ? a.pageIndex : Number.POSITIVE_INFINITY;
  const bi = b.pageIndex > 0 ? b.pageIndex : Number.POSITIVE_INFINITY;
  if (ai !== bi) return ai < bi ? -1 : 1;
  return a.startAt - b.startAt || a.firstAt - b.firstAt || compareText(a.id, b.id);
}

function firstFact<T>(views: readonly MView[], pick: (view: MView) => T | null | ""): T | null {
  for (const view of views) {
    const value = pick(view);
    if (value !== null && value !== "") return value as T;
  }
  return null;
}

function makeSession(key: string, views: MView[]): MSession {
  views.sort(compareViews);
  const landing = views[0];
  const exit = views[views.length - 1];
  // pageIndex 1, or an older document without pageIndex (then the earliest view is the landing).
  const landingInData = landing.pageIndex <= 1;
  const traffic = landingInData
    ? classifyChannel({
        referrer: landing.referrer,
        utmSource: landing.utmSource,
        utmMedium: landing.utmMedium,
        utmCampaign: landing.utmCampaign || landing.utmTerm || landing.utmContent,
      })
    : { channel: "Direct" as Channel, source: NOT_SET };
  // Device facts come from the landing page view, else from the first view that has them.
  const timeZone = firstFact(views, (v) => v.timeZone) ?? "";
  const language = firstFact(views, (v) => v.language) ?? "";
  const screenView = views.find((v) => sizeLabel(v.screenW, v.screenH));
  const viewportView = views.find((v) => sizeLabel(v.viewportW, v.viewportH));
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  let engagedMs = 0;
  for (const view of views) {
    start = Math.min(start, view.startAt);
    end = Math.max(end, view.lastAt);
    engagedMs += view.durationMs;
  }
  return {
    key,
    visitorId: landing.visitorId,
    views,
    events: [],
    contacts: [],
    start,
    end,
    landing,
    exit,
    landingInData,
    channel: traffic.channel,
    source: traffic.source,
    engagedMs,
    submitted: false,
    engaged: false,
    isNewVisitor: views.some((v) => v.isNewVisitor === true),
    country: countryFromTimeZone(timeZone, language),
    device: firstFact(views, (v) => v.device),
    browser: firstFact(views, (v) => v.browser) ?? "",
    os: firstFact(views, (v) => v.os) ?? "",
    language,
    timeZone,
    screen: screenView ? sizeLabel(screenView.screenW, screenView.screenH) : "",
    viewport: viewportView ? sizeLabel(viewportView.viewportW, viewportView.viewportH) : "",
    inRange: false,
    firstInRangeAt: Number.POSITIVE_INFINITY,
    rangeViews: 0,
    rangeEngagedMs: 0,
    countedEnquiries: 0,
    visitNumber: null,
  };
}

/* ------------------------------------------------------------------------------ model */

type Model = {
  since: number;
  until: number;
  views: MView[];
  rangeViews: MView[];
  sessions: MSession[];
  rangeSessions: MSession[];
  sessionsByKey: Map<string, MSession>;
  /** Every loaded session per visitor, oldest first. */
  byVisitor: Map<string, MSession[]>;
  events: MEvent[];
  rangeEvents: MEvent[];
  contacts: MContact[];
  notes: DataNotes;
};

function buildModel(period: ReportPeriod, excluded: ReadonlySet<string>): Model {
  const since = timeOf(period.since) ?? Number.NEGATIVE_INFINITY;
  const until = timeOf(period.until) ?? Number.POSITIVE_INFINITY;
  const inRange = (t: number) => t >= since && t < until;
  let invalidDocs = 0;

  // Page views: drop excluded visitors, then merge segments.
  const kept: PageviewDoc[] = [];
  const excludedKeys = new Set<string>();
  for (const doc of period.pageviews) {
    const visitorId = str(doc.visitorId);
    if (visitorId && excluded.has(visitorId)) {
      const at = timeOf(doc.createdAt);
      if (at !== null && inRange(at)) excludedKeys.add(`${str(doc.sessionId)}\u0000${positiveInt(doc.pageIndex) || doc.id}\u0000${str(doc.path)}`);
      continue;
    }
    kept.push(doc);
  }
  const merged = mergeViews(kept);
  invalidDocs += merged.invalid;
  const views = merged.views;
  const rangeViews: MView[] = [];
  for (const view of views) {
    view.inRange = inRange(view.firstAt);
    if (view.inRange) rangeViews.push(view);
  }

  // Sessions.
  const grouped = new Map<string, MView[]>();
  for (const view of views) {
    const list = grouped.get(view.sessionKey);
    if (list) list.push(view);
    else grouped.set(view.sessionKey, [view]);
  }
  const sessionsByKey = new Map<string, MSession>();
  for (const [key, list] of grouped) sessionsByKey.set(key, makeSession(key, list));

  // Events.
  const events: MEvent[] = [];
  let excludedEvents = 0;
  for (const doc of period.events) {
    const at = timeOf(doc.createdAt);
    if (at === null || !doc.id) {
      invalidDocs += 1;
      continue;
    }
    const visitorId = str(doc.visitorId);
    if (visitorId && excluded.has(visitorId)) {
      if (inRange(at)) excludedEvents += 1;
      continue;
    }
    events.push({
      id: doc.id,
      visitorId,
      sessionId: str(doc.sessionId),
      type: str(doc.type) || "unknown",
      label: str(doc.label),
      href: str(doc.href),
      path: str(doc.path),
      at,
      inRange: inRange(at),
    });
  }
  events.sort((a, b) => a.at - b.at || compareText(a.id, b.id));
  let orphanEvents = 0;
  const submitsByVisitor = new Map<string, MEvent[]>();
  for (const event of events) {
    const session = event.sessionId ? sessionsByKey.get(event.sessionId) : undefined;
    if (session) {
      session.events.push(event);
      if (isSubmitOk(event)) session.submitted = true;
      session.start = Math.min(session.start, event.at);
      session.end = Math.max(session.end, event.at);
    } else if (event.inRange) {
      orphanEvents += 1;
    }
    if (isSubmitOk(event) && event.visitorId) {
      const list = submitsByVisitor.get(event.visitorId);
      if (list) list.push(event);
      else submitsByVisitor.set(event.visitorId, [event]);
    }
  }

  const sessions = [...sessionsByKey.values()].sort((a, b) => a.start - b.start || compareText(a.key, b.key));
  const byVisitor = new Map<string, MSession[]>();
  for (const session of sessions) {
    const list = byVisitor.get(session.visitorId);
    if (list) list.push(session);
    else byVisitor.set(session.visitorId, [session]);
  }
  for (const list of byVisitor.values()) {
    if (list[0].isNewVisitor) list.forEach((session, i) => (session.visitNumber = i + 1));
  }

  // Contacts: flags, then match each one to the session it was sent from.
  const contacts: MContact[] = [];
  for (const doc of period.contacts) {
    if (!doc.id) {
      invalidDocs += 1;
      continue;
    }
    const at = timeOf(doc.createdAt);
    const visitorId = str(doc.visitorId);
    const status = statusOf(doc.status);
    const isExcluded = Boolean(visitorId) && excluded.has(visitorId);
    const contactInRange = at !== null && inRange(at);
    const contact: MContact = {
      doc,
      id: doc.id,
      at,
      visitorId,
      status,
      inRange: contactInRange,
      excluded: isExcluded,
      spam: status === "spam",
      counted: contactInRange && status !== "spam" && !isExcluded,
      session: null,
      matchedBy: null,
    };
    matchContact(contact, byVisitor, submitsByVisitor, sessionsByKey);
    if (contact.session) contact.session.contacts.push(contact);
    contacts.push(contact);
  }

  // Engagement and range facts.
  const rangeSessions: MSession[] = [];
  let partialSessions = 0;
  for (const session of sessions) {
    session.engaged =
      session.engagedMs >= ENGAGED_MIN_MS ||
      session.views.length >= ENGAGED_MIN_PAGES ||
      session.submitted ||
      session.contacts.some((contact) => !contact.spam);
    session.countedEnquiries = session.contacts.filter((contact) => contact.counted).length;
    for (const view of session.views) {
      if (!view.inRange) continue;
      session.inRange = true;
      session.rangeViews += 1;
      session.rangeEngagedMs += view.durationMs;
      session.firstInRangeAt = Math.min(session.firstInRangeAt, view.firstAt);
    }
    if (session.inRange) {
      rangeSessions.push(session);
      if (!session.landingInData) partialSessions += 1;
    }
  }

  const rangeEvents = events.filter((event) => event.inRange);
  const rangeContacts = contacts.filter((contact) => contact.inRange);
  const notes: DataNotes = {
    pageviewDocs: period.pageviews.length,
    eventDocs: period.events.length,
    contactDocs: period.contacts.length,
    pageviewsInRange: rangeViews.length,
    eventsInRange: rangeEvents.length,
    contactsInRange: rangeContacts.length,
    excludedPageviews: excludedKeys.size,
    excludedEvents,
    excludedEnquiries: rangeContacts.filter((contact) => contact.excluded).length,
    mergedSegments: rangeViews.reduce((sum, view) => sum + view.segments - 1, 0),
    invalidDocs,
    contextPageviews: views.length - rangeViews.length,
    partialSessions,
    orphanEvents,
    unmatchedEnquiries: rangeContacts.filter((contact) => contact.counted && !contact.session).length,
    spamEnquiries: rangeContacts.filter((contact) => contact.spam).length,
    legacyPageviews: rangeViews.filter((view) => view.pageIndex === 0).length,
  };

  return {
    since,
    until,
    views,
    rangeViews,
    sessions,
    rangeSessions,
    sessionsByKey,
    byVisitor,
    events,
    rangeEvents,
    contacts,
    notes,
  };
}

/** Event match first (the form_submit that followed the save), then time. */
function matchContact(
  contact: MContact,
  byVisitor: Map<string, MSession[]>,
  submitsByVisitor: Map<string, MEvent[]>,
  sessionsByKey: Map<string, MSession>,
): void {
  const at = contact.at;
  if (!contact.visitorId || at === null) return;
  let best: MEvent | null = null;
  for (const event of submitsByVisitor.get(contact.visitorId) ?? []) {
    const gap = Math.abs(event.at - at);
    if (gap <= SUBMIT_MATCH_MS && (!best || gap < Math.abs(best.at - at))) best = event;
  }
  const viaEvent = best ? sessionsByKey.get(best.sessionId) : undefined;
  if (viaEvent) {
    contact.session = viaEvent;
    contact.matchedBy = "event";
    return;
  }
  let candidate: MSession | null = null;
  for (const session of byVisitor.get(contact.visitorId) ?? []) {
    if (session.start <= at + SUBMIT_MATCH_MS) candidate = session;
    else break;
  }
  if (candidate && at <= candidate.end + SESSION_IDLE_MS) {
    contact.session = candidate;
    contact.matchedBy = "time";
  }
}

/* --------------------------------------------------------------------------- aggregates */

type Acc = {
  sessions: number;
  visitors: Set<string>;
  engaged: number;
  enquiries: number;
  converted: number;
  pageviews: number;
  engagedMs: number;
};

function newAcc(): Acc {
  return { sessions: 0, visitors: new Set<string>(), engaged: 0, enquiries: 0, converted: 0, pageviews: 0, engagedMs: 0 };
}

function addSession(acc: Acc, session: MSession): void {
  acc.sessions += 1;
  acc.visitors.add(session.visitorId);
  if (session.engaged) acc.engaged += 1;
  acc.enquiries += session.countedEnquiries;
  if (session.countedEnquiries > 0) acc.converted += 1;
  acc.pageviews += session.rangeViews;
  acc.engagedMs += session.rangeEngagedMs;
}

function metricsOf(acc: Acc): SessionMetrics {
  return {
    sessions: acc.sessions,
    visitors: acc.visitors.size,
    engagedSessions: acc.engaged,
    engagedRate: ratio(acc.engaged, acc.sessions),
    bounceRate: acc.sessions > 0 ? 1 - acc.engaged / acc.sessions : 0,
    enquiries: acc.enquiries,
    convertedSessions: acc.converted,
    conversionRate: ratio(acc.converted, acc.sessions),
    pageviews: acc.pageviews,
    avgEngagedMs: ratio(acc.engagedMs, acc.sessions),
  };
}

function groupSessions<T>(
  sessions: readonly MSession[],
  keyOf: (session: MSession) => string | null,
  meta: (session: MSession) => T,
): { key: string; meta: T; acc: Acc }[] {
  const groups = new Map<string, { key: string; meta: T; acc: Acc }>();
  for (const session of sessions) {
    const key = keyOf(session);
    if (key === null) continue;
    let group = groups.get(key);
    if (!group) {
      group = { key, meta: meta(session), acc: newAcc() };
      groups.set(key, group);
    }
    addSession(group.acc, session);
  }
  return [...groups.values()].sort((a, b) => b.acc.sessions - a.acc.sessions || compareText(a.key, b.key));
}

function breakdown(
  sessions: readonly MSession[],
  keyOf: (session: MSession) => string,
  labelOf: (session: MSession, key: string) => string,
): BreakdownRow[] {
  const total = sessions.length;
  return groupSessions(sessions, keyOf, (session) => labelOf(session, keyOf(session))).map((group) => ({
    key: group.key,
    label: group.meta,
    share: ratio(group.acc.sessions, total),
    ...metricsOf(group.acc),
  }));
}

/* ---------------------------------------------------------------------------- KPIs */

type KpiNumbers = Record<KpiKey, { value: number; measured: boolean }>;

const KPI_KINDS: Record<KpiKey, KpiKind> = {
  visitors: "count",
  newVisitors: "count",
  returningVisitors: "count",
  sessions: "count",
  pageviews: "count",
  avgEngagedMsPerSession: "duration",
  avgPagesPerSession: "average",
  engagedSessions: "count",
  bounceRate: "rate",
  enquiries: "count",
  conversionRate: "rate",
  medianLoadMs: "duration",
};

function kpiNumbers(model: Model): KpiNumbers {
  const sessions = model.rangeSessions;
  const count = sessions.length;
  const visitors = new Set<string>();
  const fresh = new Set<string>();
  let engaged = 0;
  let converted = 0;
  for (const session of sessions) {
    visitors.add(session.visitorId);
    if (session.isNewVisitor) fresh.add(session.visitorId);
    if (session.engaged) engaged += 1;
    if (session.countedEnquiries > 0) converted += 1;
  }
  let engagedMs = 0;
  const loads: number[] = [];
  for (const view of model.rangeViews) {
    engagedMs += view.durationMs;
    if (view.loadMs !== null) loads.push(view.loadMs);
  }
  const medianLoad = quantile(loads, 0.5);
  const some = count > 0;
  return {
    visitors: { value: visitors.size, measured: true },
    newVisitors: { value: fresh.size, measured: true },
    returningVisitors: { value: visitors.size - fresh.size, measured: true },
    sessions: { value: count, measured: true },
    pageviews: { value: model.rangeViews.length, measured: true },
    avgEngagedMsPerSession: { value: ratio(engagedMs, count), measured: some },
    avgPagesPerSession: { value: ratio(model.rangeViews.length, count), measured: some },
    engagedSessions: { value: engaged, measured: true },
    bounceRate: { value: some ? 1 - engaged / count : 0, measured: some },
    enquiries: { value: model.contacts.filter((contact) => contact.counted).length, measured: true },
    conversionRate: { value: ratio(converted, count), measured: some },
    medianLoadMs: { value: medianLoad === null ? 0 : Math.round(medianLoad), measured: medianLoad !== null },
  };
}

function toKpis(current: KpiNumbers, previous: KpiNumbers | null): ReportKpis {
  const out = {} as ReportKpis;
  for (const key of Object.keys(KPI_KINDS) as KpiKey[]) {
    const kind = KPI_KINDS[key];
    const now = current[key];
    const before = previous && previous[key].measured ? previous[key].value : null;
    let change: number | null = null;
    if (before !== null && now.measured) {
      if (kind === "rate") change = now.value - before;
      else if (before !== 0) change = (now.value - before) / Math.abs(before);
      else change = now.value === 0 ? 0 : null;
    }
    out[key] = { value: now.value, previous: before, change, kind, measured: now.measured };
  }
  return out;
}

/* --------------------------------------------------------------------------- timeline */

function buildTimeline(model: Model, clock: ZoneClock, unit: "hour" | "day"): TimelineBucket[] {
  const { since, until } = model;
  if (!Number.isFinite(since) || !Number.isFinite(until) || until <= since) return [];
  const keyOf = (t: number) => (unit === "hour" ? clock.hourKey(t) : clock.dayKey(t));

  // Walk 15-minute slots: every local hour and day starts on one.
  const spans: { key: string; start: number; end: number }[] = [];
  let start = Math.floor(since / SLOT_MS) * SLOT_MS;
  let key = keyOf(since);
  for (let guard = 0; guard < 200 && keyOf(start - SLOT_MS) === key; guard += 1) start -= SLOT_MS;
  const maxSlots = Math.ceil((until - start) / SLOT_MS) + 200;
  for (let i = 1, t = start + SLOT_MS; i <= maxSlots; i += 1, t += SLOT_MS) {
    const next = keyOf(t);
    if (next === key) continue;
    spans.push({ key, start, end: t });
    if (t >= until || spans.length >= 2000) break;
    start = t;
    key = next;
  }

  const index = new Map<string, number>();
  const buckets: TimelineBucket[] = spans.map((span, i) => {
    index.set(span.key, i);
    const p = clock.parts(span.start);
    const date = `${p.day} ${MONTHS[p.month]}`;
    const hour = `${String(p.hour).padStart(2, "0")}:00`;
    const nextHour = `${String((p.hour + 1) % 24).padStart(2, "0")}:00`;
    return {
      key: span.key,
      start: new Date(span.start),
      end: new Date(span.end),
      label: unit === "hour" ? hour : date,
      longLabel:
        unit === "hour" ? `${DAY_NAMES[p.weekday]} ${date}, ${hour}-${nextHour}` : `${DAY_NAMES[p.weekday]} ${date} ${p.year}`,
      partial: span.start < since || span.end > until,
      views: 0,
      visitors: 0,
      sessions: 0,
      enquiries: 0,
    };
  });
  const visitorSets = buckets.map(() => new Set<string>());
  const bucketOf = (t: number) => index.get(keyOf(t));

  for (const view of model.rangeViews) {
    const i = bucketOf(view.firstAt);
    if (i === undefined) continue;
    buckets[i].views += 1;
    visitorSets[i].add(view.visitorId);
  }
  for (const session of model.rangeSessions) {
    const i = bucketOf(session.firstInRangeAt);
    if (i !== undefined) buckets[i].sessions += 1;
  }
  for (const contact of model.contacts) {
    if (!contact.counted || contact.at === null) continue;
    const i = bucketOf(contact.at);
    if (i !== undefined) buckets[i].enquiries += 1;
  }
  buckets.forEach((bucket, i) => (bucket.visitors = visitorSets[i].size));
  return buckets;
}

function buildHeatmap(model: Model, clock: ZoneClock): Heatmap {
  const cells = WEEKDAYS.map(() => new Array<number>(24).fill(0));
  for (const view of model.rangeViews) {
    const p = clock.parts(view.firstAt);
    cells[(p.weekday + 6) % 7][p.hour] += 1;
  }
  let max = 0;
  for (const row of cells) for (const value of row) max = Math.max(max, value);
  return { days: WEEKDAYS, cells, max, total: model.rangeViews.length };
}

/* ------------------------------------------------------------------------------ tables */

function buildPages(model: Model): PageStatsRow[] {
  type Row = {
    title: string;
    titleAt: number;
    views: number;
    visitors: Set<string>;
    sessions: Set<string>;
    entries: number;
    entriesEngaged: number;
    exits: number;
    engagedMs: number;
    scrollSum: number;
    scrollCount: number;
  };
  const rows = new Map<string, Row>();
  for (const view of model.rangeViews) {
    const session = model.sessionsByKey.get(view.sessionKey);
    let row = rows.get(view.path);
    if (!row) {
      row = {
        title: "",
        titleAt: Number.NEGATIVE_INFINITY,
        views: 0,
        visitors: new Set(),
        sessions: new Set(),
        entries: 0,
        entriesEngaged: 0,
        exits: 0,
        engagedMs: 0,
        scrollSum: 0,
        scrollCount: 0,
      };
      rows.set(view.path, row);
    }
    row.views += 1;
    row.visitors.add(view.visitorId);
    row.sessions.add(view.sessionKey);
    row.engagedMs += view.durationMs;
    if (view.scroll !== null) {
      row.scrollSum += view.scroll;
      row.scrollCount += 1;
    }
    if (view.title && view.firstAt >= row.titleAt) {
      row.title = view.title;
      row.titleAt = view.firstAt;
    }
    if (session && session.landing === view && session.landingInData) {
      row.entries += 1;
      if (session.engaged) row.entriesEngaged += 1;
    }
    if (session && session.exit === view) row.exits += 1;
  }
  return [...rows.entries()]
    .map(([path, row]) => ({
      path,
      title: row.title,
      views: row.views,
      visitors: row.visitors.size,
      sessions: row.sessions.size,
      entries: row.entries,
      exits: row.exits,
      totalEngagedMs: row.engagedMs,
      avgEngagedMs: ratio(row.engagedMs, row.views),
      avgScroll: row.scrollCount ? row.scrollSum / row.scrollCount : null,
      bounceRate: row.entries ? 1 - row.entriesEngaged / row.entries : null,
      exitRate: ratio(row.exits, row.views),
    }))
    .sort((a, b) => b.views - a.views || compareText(a.path, b.path));
}

function utmKey(view: MView): string | null {
  if (!view.utmSource && !view.utmMedium && !view.utmCampaign && !view.utmTerm && !view.utmContent) return null;
  return [view.utmSource, view.utmMedium, view.utmCampaign, view.utmTerm, view.utmContent].join("\u0000");
}

/* --------------------------------------------------------------------------- behaviour */

function clickRows(events: readonly MEvent[], types: readonly string[]): (ClickRow & { type: string })[] {
  type Row = { type: string; label: string; clicks: number; sessions: Set<string>; visitors: Set<string>; hrefs: Map<string, number>; paths: Map<string, number> };
  const rows = new Map<string, Row>();
  for (const event of events) {
    if (!types.includes(event.type)) continue;
    const label = event.label || event.href || "(no label)";
    const key = `${event.type}\u0000${label}`;
    let row = rows.get(key);
    if (!row) {
      row = { type: event.type, label, clicks: 0, sessions: new Set(), visitors: new Set(), hrefs: new Map(), paths: new Map() };
      rows.set(key, row);
    }
    row.clicks += 1;
    row.sessions.add(event.sessionId || event.id);
    row.visitors.add(event.visitorId || event.id);
    if (event.href) row.hrefs.set(event.href, (row.hrefs.get(event.href) ?? 0) + 1);
    if (event.path) row.paths.set(event.path, (row.paths.get(event.path) ?? 0) + 1);
  }
  const top = (counts: Map<string, number>) =>
    [...counts.entries()].sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))[0]?.[0] ?? "";
  return [...rows.values()]
    .map((row) => ({
      type: row.type,
      label: row.label,
      href: top(row.hrefs),
      path: top(row.paths),
      clicks: row.clicks,
      sessions: row.sessions.size,
      visitors: row.visitors.size,
    }))
    .sort((a, b) => b.clicks - a.clicks || compareText(a.label, b.label));
}

function stripType<T extends { type: string }>(rows: T[]): Omit<T, "type">[] {
  return rows.map(({ type: _type, ...rest }) => rest);
}

function buildBehaviour(model: Model, pages: readonly PageStatsRow[]): Behaviour {
  const events = model.rangeEvents;
  const totals = new Map<string, { events: number; sessions: Set<string>; visitors: Set<string> }>();
  for (const event of events) {
    let row = totals.get(event.type);
    if (!row) {
      row = { events: 0, sessions: new Set(), visitors: new Set() };
      totals.set(event.type, row);
    }
    row.events += 1;
    row.sessions.add(event.sessionId || event.id);
    row.visitors.add(event.visitorId || event.id);
  }
  const eventTotals = [...totals.entries()]
    .map(([type, row]) => ({ type, events: row.events, sessions: row.sessions.size, visitors: row.visitors.size }))
    .sort((a, b) => b.events - a.events || compareText(a.type, b.type));

  const sessions = model.rangeSessions;
  const hasEvent = (session: MSession, type: string) => session.events.some((event) => event.type === type);
  const errorFields = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "form_error") continue;
    const colon = event.label.indexOf(":");
    const list = colon >= 0 ? event.label.slice(colon + 1) : event.label;
    for (const field of list.split(",")) {
      const name = field.trim();
      if (name) errorFields.set(name, (errorFields.get(name) ?? 0) + 1);
    }
  }
  const formFunnel: FormFunnel = {
    contactPageSessions: sessions.filter((session) => session.views.some((view) => CONTACT_PATH.test(view.path))).length,
    formStarts: sessions.filter((session) => hasEvent(session, "form_start")).length,
    formErrors: sessions.filter((session) => hasEvent(session, "form_error")).length,
    submissions: sessions.filter((session) => session.submitted).length,
    failedSubmissions: events.filter(isSubmitFailed).length,
    enquiries: model.contacts.filter((contact) => contact.counted).length,
    errorFields: [...errorFields.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count || compareText(a.field, b.field)),
  };

  const top = new Set(pages.slice(0, 10).map((row) => row.path));
  const scroll = new Map<string, ScrollRow & { sum: number }>();
  for (const view of model.rangeViews) {
    if (!top.has(view.path)) continue;
    let row = scroll.get(view.path);
    if (!row) {
      row = { path: view.path, views: 0, measured: 0, buckets: [0, 0, 0, 0], avgScroll: null, sum: 0 };
      scroll.set(view.path, row);
    }
    row.views += 1;
    if (view.scroll === null) continue;
    row.measured += 1;
    row.sum += view.scroll;
    row.buckets[view.scroll >= 75 ? 3 : view.scroll >= 50 ? 2 : view.scroll >= 25 ? 1 : 0] += 1;
  }
  const scrollDistribution = [...scroll.values()]
    .map(({ sum, ...row }) => ({ ...row, avgScroll: row.measured ? sum / row.measured : null }))
    .sort((a, b) => b.views - a.views || compareText(a.path, b.path));

  return {
    eventTotals,
    ctaClicks: stripType(clickRows(events, ["cta_click"])),
    outboundClicks: stripType(clickRows(events, ["outbound"])),
    playClicks: stripType(clickRows(events, ["play"])),
    navClicks: stripType(clickRows(events, ["nav"])),
    contactClicks: clickRows(events, ["mailto", "tel"]) as (ClickRow & { type: "mailto" | "tel" })[],
    mailtoClicks: events.filter((event) => event.type === "mailto").length,
    telClicks: events.filter((event) => event.type === "tel").length,
    formFunnel,
    scrollDistribution,
  };
}

/* ------------------------------------------------------------------------------- speed */

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function speedRow(key: string, label: string, samples: readonly number[]): SpeedRow {
  const median = quantile(samples, 0.5);
  const p75 = quantile(samples, 0.75);
  return {
    key,
    label,
    samples: samples.length,
    medianMs: median === null ? null : Math.round(median),
    p75Ms: p75 === null ? null : Math.round(p75),
  };
}

function buildSpeed(model: Model): Speed {
  const all: number[] = [];
  const byDevice = new Map<string, number[]>();
  const byPage = new Map<string, number[]>();
  for (const view of model.rangeViews) {
    if (view.loadMs === null) continue;
    all.push(view.loadMs);
    pushTo(byDevice, view.device ?? "unknown", view.loadMs);
    pushTo(byPage, view.path, view.loadMs);
  }
  const rows = (groups: Map<string, number[]>, label: (key: string) => string) =>
    [...groups.entries()]
      .map(([key, samples]) => speedRow(key, label(key), samples))
      .sort((a, b) => b.samples - a.samples || compareText(a.key, b.key));
  return {
    overall: speedRow("all", "All pages", all),
    byDevice: rows(byDevice, (key) => (key === "unknown" ? UNKNOWN : key[0].toUpperCase() + key.slice(1))),
    byLandingPage: rows(byPage, (key) => key),
  };
}

/* ------------------------------------------------------------------- details and lists */

function pageOf(view: MView): SessionPage {
  return {
    pageIndex: view.pageIndex,
    path: view.path,
    title: view.title,
    at: new Date(view.startAt),
    leftAt: new Date(view.lastAt),
    durationMs: view.durationMs,
    scrollDepth: view.scroll,
    segments: view.segments,
    loadMs: view.loadMs,
    inRange: view.inRange,
  };
}

function sessionDetail(session: MSession): SessionDetail {
  const landing = session.landing;
  const known = session.landingInData;
  return {
    id: session.key,
    visitorId: session.visitorId,
    start: new Date(session.start),
    end: new Date(session.end),
    inRange: session.inRange,
    landing: known ? landing.path : NOT_SET,
    landingTitle: known ? landing.title : "",
    landingInData: known,
    exit: session.exit.path,
    pageCount: session.views.length,
    engagedMs: session.engagedMs,
    engaged: session.engaged,
    channel: session.channel,
    source: session.source,
    referrer: known ? landing.referrer : "",
    utmSource: known ? landing.utmSource : "",
    utmMedium: known ? landing.utmMedium : "",
    utmCampaign: known ? landing.utmCampaign : "",
    utmTerm: known ? landing.utmTerm : "",
    utmContent: known ? landing.utmContent : "",
    device: session.device,
    browser: session.browser,
    os: session.os,
    screen: session.screen,
    viewport: session.viewport,
    country: session.country,
    timeZone: session.timeZone,
    language: session.language,
    isNewVisitor: session.isNewVisitor,
    visitNumber: session.visitNumber,
    loadMs: firstFact(session.views, (view) => view.loadMs),
    submitted: session.submitted,
    pages: session.views.map(pageOf),
    events: session.events.map((event) => ({
      id: event.id,
      type: event.type,
      label: event.label,
      href: event.href,
      path: event.path,
      at: new Date(event.at),
    })),
    enquiryIds: session.contacts.map((contact) => contact.id),
  };
}

function enquiryDetail(contact: MContact, model: Model): EnquiryDetail {
  const doc = contact.doc;
  const ua = parseUserAgent(str(doc.userAgent));
  const history = contact.visitorId ? (model.byVisitor.get(contact.visitorId) ?? []) : [];
  const first = history[0] ?? null;
  const referrer = str(doc.referrer);
  let attribution: EnquiryDetail["attribution"] = "none";
  let channel: Channel | null = null;
  let source: string | null = null;
  if (first) {
    attribution = "visitor";
    channel = first.channel;
    source = first.source;
  } else if (referrer) {
    const traffic = classifyChannel({ referrer });
    attribution = "referrer";
    channel = traffic.channel;
    source = traffic.source;
  }
  const at = contact.at;
  const updatedAt = timeOf(doc.updatedAt);
  const session = contact.session;
  let sessionsBefore: number | null = null;
  let pagesBefore: number | null = null;
  if (first && at !== null) {
    sessionsBefore = history.filter((item) => item.start <= at || item === session).length;
    pagesBefore = 0;
    for (const item of history) for (const view of item.views) if (view.startAt <= at) pagesBefore += 1;
  }
  return {
    id: contact.id,
    createdAt: at === null ? null : new Date(at),
    updatedAt: updatedAt === null ? null : new Date(updatedAt),
    status: contact.status,
    name: str(doc.name),
    company: str(doc.company),
    email: str(doc.email),
    phone: str(doc.phone),
    service: str(doc.service),
    budget: str(doc.budget),
    message: typeof doc.message === "string" ? doc.message : "",
    page: str(doc.page),
    referrer,
    userAgent: str(doc.userAgent),
    language: str(doc.language),
    timeZone: str(doc.timeZone),
    visitorId: contact.visitorId,
    browser: ua.browser,
    browserVersion: ua.browserVersion,
    os: ua.os,
    osVersion: ua.osVersion,
    device: ua.device,
    country: countryFromTimeZone(str(doc.timeZone), str(doc.language)),
    inRange: contact.inRange,
    counted: contact.counted,
    excluded: contact.excluded,
    attribution,
    channel,
    source,
    firstLanding: first ? (first.landingInData ? first.landing.path : NOT_SET) : null,
    firstSeen: first ? new Date(first.start) : null,
    historyComplete: first ? first.isNewVisitor : false,
    sessionId: session ? session.key : null,
    matchedBy: contact.matchedBy,
    sessionChannel: session ? session.channel : null,
    sessionSource: session ? session.source : null,
    sessionLanding: session ? (session.landingInData ? session.landing.path : NOT_SET) : null,
    sessionsBeforeEnquiry: sessionsBefore,
    pagesBeforeEnquiry: pagesBefore,
    timeToEnquiryMs: first && at !== null ? Math.max(0, at - first.start) : null,
    visitorSessions: history.length,
  };
}

function compareContactsNewestFirst(a: MContact, b: MContact): number {
  if (a.at === null || b.at === null) return a.at === null ? (b.at === null ? compareText(a.id, b.id) : 1) : -1;
  return b.at - a.at || compareText(a.id, b.id);
}

function buildVisitors(model: Model): VisitorRow[] {
  const enquiriesByVisitor = new Map<string, MContact[]>();
  for (const contact of model.contacts) {
    if (!contact.visitorId || contact.excluded) continue;
    const list = enquiriesByVisitor.get(contact.visitorId);
    if (list) list.push(contact);
    else enquiriesByVisitor.set(contact.visitorId, [contact]);
  }
  const rows: VisitorRow[] = [];
  for (const [visitorId, history] of model.byVisitor) {
    const inRange = history.filter((session) => session.inRange);
    if (inRange.length === 0) continue;
    const first = history[0];
    const latest = history[history.length - 1];
    const enquiries = (enquiriesByVisitor.get(visitorId) ?? [])
      .slice()
      .sort((a, b) => (a.at ?? 0) - (b.at ?? 0) || compareText(a.id, b.id));
    rows.push({
      id: visitorId,
      firstSeen: new Date(first.start),
      lastSeen: new Date(history.reduce((max, session) => Math.max(max, session.end), first.end)),
      historyComplete: first.isNewVisitor,
      isNew: inRange.some((session) => session.isNewVisitor),
      sessions: inRange.length,
      pageviews: inRange.reduce((sum, session) => sum + session.rangeViews, 0),
      engagedMs: inRange.reduce((sum, session) => sum + session.rangeEngagedMs, 0),
      firstChannel: first.channel,
      firstSource: first.source,
      firstLanding: first.landingInData ? first.landing.path : NOT_SET,
      country: latest.country,
      device: latest.device,
      browser: latest.browser,
      os: latest.os,
      enquiryIds: enquiries.map((contact) => contact.id),
      sessionIds: inRange
        .slice()
        .sort((a, b) => b.start - a.start || compareText(a.key, b.key))
        .map((session) => session.key),
    });
  }
  return rows.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime() || compareText(a.id, b.id));
}

function buildAudience(sessions: readonly MSession[]): Audience {
  const capital = (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : UNKNOWN);
  return {
    countries: breakdown(
      sessions,
      (s) => s.country?.code ?? "unknown",
      (s) => s.country?.name ?? UNKNOWN,
    ),
    languages: breakdown(
      sessions,
      (s) => s.language || "unknown",
      (s) => s.language || UNKNOWN,
    ),
    devices: breakdown(
      sessions,
      (s) => s.device ?? "unknown",
      (s) => capital(s.device ?? ""),
    ),
    browsers: breakdown(
      sessions,
      (s) => s.browser || "unknown",
      (s) => s.browser || UNKNOWN,
    ),
    os: breakdown(
      sessions,
      (s) => s.os || "unknown",
      (s) => s.os || UNKNOWN,
    ),
    screens: breakdown(
      sessions,
      (s) => s.screen || "unknown",
      (s) => s.screen || UNKNOWN,
    ),
    timeZones: breakdown(
      sessions,
      (s) => s.timeZone || "unknown",
      (s) => s.timeZone || UNKNOWN,
    ),
    newVsReturning: breakdown(
      sessions,
      (s) => (s.isNewVisitor ? "new" : "returning"),
      (s) => (s.isNewVisitor ? "New" : "Returning"),
    ),
  };
}

/* ================================================================================ public */

export function buildReport(input: ReportInput): Report {
  const excluded = input.excludedVisitors ?? EMPTY_SET;
  const timeZone = resolveTimeZone(input.timeZone);
  const clock = new ZoneClock(timeZone);
  const model = buildModel(input, excluded);
  const previous = input.previous ? kpiNumbers(buildModel(input.previous, excluded)) : null;
  const span = model.until - model.since;
  const unit: Report["unit"] = span <= HOURLY_MAX_SPAN_MS ? "hour" : "day";
  const sessions = model.rangeSessions;
  const total = sessions.length;

  const channels: ChannelRow[] = groupSessions(sessions, (s) => s.channel, (s) => s.channel).map((group) => ({
    channel: group.meta,
    share: ratio(group.acc.sessions, total),
    ...metricsOf(group.acc),
  }));
  const sources: SourceRow[] = groupSessions(
    sessions,
    (s) => `${s.channel}\u0000${s.source}`,
    (s) => ({ channel: s.channel, source: s.source }),
  ).map((group) => ({ ...group.meta, share: ratio(group.acc.sessions, total), ...metricsOf(group.acc) }));
  const campaigns: CampaignRow[] = groupSessions(
    sessions,
    (s) => (s.landingInData ? utmKey(s.landing) : null),
    (s) => ({
      utmSource: s.landing.utmSource,
      utmMedium: s.landing.utmMedium,
      utmCampaign: s.landing.utmCampaign,
      utmTerm: s.landing.utmTerm,
      utmContent: s.landing.utmContent,
      channel: s.channel,
    }),
  ).map((group) => ({ ...group.meta, ...metricsOf(group.acc) }));
  const landingPages: LandingPageRow[] = groupSessions(
    sessions,
    (s) => (s.landingInData ? s.landing.path : NOT_SET),
    (s) => ({ path: s.landingInData ? s.landing.path : NOT_SET, title: s.landingInData ? s.landing.title : "" }),
  ).map((group) => ({ ...group.meta, share: ratio(group.acc.sessions, total), ...metricsOf(group.acc) }));
  const pages = buildPages(model);

  return {
    since: new Date(model.since),
    until: new Date(model.until),
    timeZone,
    unit,
    kpis: toKpis(kpiNumbers(model), previous),
    timeline: buildTimeline(model, clock, unit),
    channels,
    sources,
    campaigns,
    landingPages,
    pages,
    sessions: sessions
      .slice()
      .sort((a, b) => b.start - a.start || compareText(a.key, b.key))
      .map(sessionDetail),
    visitors: buildVisitors(model),
    audience: buildAudience(sessions),
    heatmap: buildHeatmap(model, clock),
    behaviour: buildBehaviour(model, pages),
    speed: buildSpeed(model),
    enquiries: model.contacts
      .slice()
      .sort(compareContactsNewestFirst)
      .map((contact) => enquiryDetail(contact, model)),
    dataNotes: model.notes,
  };
}

export function visitorJourney(
  visitorId: string,
  docs: { pageviews: readonly PageviewDoc[]; events: readonly EventDoc[]; contacts: readonly ContactDoc[] },
): Journey {
  const id = visitorId.trim();
  const mine = <T extends { visitorId?: string }>(list: readonly T[]) => list.filter((doc) => str(doc.visitorId) === id);
  const model = buildModel(
    {
      pageviews: mine(docs.pageviews),
      events: mine(docs.events),
      contacts: mine(docs.contacts),
      since: new Date(-8.64e15),
      until: new Date(8.64e15),
    },
    EMPTY_SET,
  );
  const history = model.byVisitor.get(id) ?? [];
  const first = history[0] ?? null;
  const latest = history[history.length - 1] ?? null;
  const contacts = model.contacts
    .slice()
    .sort((a, b) => (a.at ?? Number.POSITIVE_INFINITY) - (b.at ?? Number.POSITIVE_INFINITY) || compareText(a.id, b.id));
  let firstSeen = Number.POSITIVE_INFINITY;
  let lastSeen = Number.NEGATIVE_INFINITY;
  const see = (t: number) => {
    firstSeen = Math.min(firstSeen, t);
    lastSeen = Math.max(lastSeen, t);
  };
  for (const session of history) {
    see(session.start);
    see(session.end);
  }
  for (const event of model.events) see(event.at);
  for (const contact of contacts) if (contact.at !== null) see(contact.at);
  return {
    visitorId: id,
    found: model.views.length > 0 || model.events.length > 0 || model.contacts.length > 0,
    firstSeen: Number.isFinite(firstSeen) ? new Date(firstSeen) : null,
    lastSeen: Number.isFinite(lastSeen) ? new Date(lastSeen) : null,
    historyComplete: first ? first.isNewVisitor : false,
    firstTouch: first
      ? {
          channel: first.channel,
          source: first.source,
          referrer: first.landingInData ? first.landing.referrer : "",
          landing: first.landingInData ? first.landing.path : NOT_SET,
          utmSource: first.landingInData ? first.landing.utmSource : "",
          utmMedium: first.landingInData ? first.landing.utmMedium : "",
          utmCampaign: first.landingInData ? first.landing.utmCampaign : "",
          utmTerm: first.landingInData ? first.landing.utmTerm : "",
          utmContent: first.landingInData ? first.landing.utmContent : "",
          at: new Date(first.start),
        }
      : null,
    totals: {
      sessions: history.length,
      engagedSessions: history.filter((session) => session.engaged).length,
      pageviews: model.views.length,
      engagedMs: model.views.reduce((sum, view) => sum + view.durationMs, 0),
      events: model.events.length,
      enquiries: contacts.filter((contact) => !contact.spam).length,
    },
    country: latest?.country ?? null,
    device: latest?.device ?? null,
    browser: latest?.browser ?? "",
    os: latest?.os ?? "",
    language: latest?.language ?? "",
    timeZone: latest?.timeZone ?? "",
    screen: latest?.screen ?? "",
    sessions: history.map(sessionDetail),
    enquiries: contacts.map((contact) => enquiryDetail(contact, model)),
  };
}

/** Page views with their segments merged (time summed, scroll max), newest first. */
export function mergePageviews(docs: PageviewDoc[]): View[] {
  return mergeViews(docs)
    .views.map((view) => ({
      ...view.doc,
      title: view.title || view.doc.title,
      createdAt: new Date(view.firstAt),
      durationMs: view.durationMs,
      scrollDepth: view.scroll ?? undefined,
      loadMs: view.loadMs ?? undefined,
      segments: view.segments,
      startedAt: new Date(view.startAt),
      leftAt: new Date(view.lastAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || compareText(a.id, b.id));
}

/* ============================================================================== formatting */

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

export function formatPercent(share: number, digits = 0): string {
  if (!Number.isFinite(share)) return "-";
  return `${(share * 100).toFixed(digits)}%`;
}

/** "+12%", "-3%" for relative changes; "+4.5 pts" for rates; "" when there is no change to show. */
export function formatChange(kpi: Pick<Kpi, "change" | "kind">): string {
  if (kpi.change === null || !Number.isFinite(kpi.change)) return "";
  if (kpi.kind === "rate") {
    const points = kpi.change * 100;
    const shown = Math.abs(points) < 10 ? points.toFixed(1) : points.toFixed(0);
    return `${points > 0 ? "+" : points < 0 ? "-" : ""}${shown.replace("-", "")} pts`;
  }
  const pct = Math.round(kpi.change * 100);
  return `${pct > 0 ? "+" : pct < 0 ? "-" : ""}${Math.abs(pct)}%`;
}

export function formatDateTime(date: Date | null | undefined, timeZone?: string): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  try {
    return date.toLocaleString(undefined, timeZone ? { ...options, timeZone } : options);
  } catch {
    return date.toLocaleString(undefined, options);
  }
}

/* ===================================================================== legacy (deprecated) */
/* Kept so the current components/admin/* keep compiling until they move to buildReport(). */

/** @deprecated Use buildReport(). A merged page view (createdAt = its first segment). */
export type View = PageviewDoc & {
  createdAt: Date;
  durationMs: number;
  segments: number;
  /** Estimated time the page was opened. */
  startedAt?: Date;
  /** When the page was last left. */
  leftAt?: Date;
};

/** @deprecated Use ReportKpis. */
export type Kpis = {
  pageViews: number;
  visitors: number;
  sessions: number;
  avgTimeMs: number;
  pagesPerSession: number;
  newVisitors: number;
  returningVisitors: number;
  contacts: number;
  events: number;
};

/** @deprecated Use buildReport().kpis. */
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

/** @deprecated Use TimelineBucket. */
export type Bucket = { start: Date; label: string; longLabel: string; views: number };

/** @deprecated Use buildReport().timeline (time-zone aware, with visitors, sessions and enquiries). */
export function timeline(views: View[], since: Date, until: Date): Bucket[] {
  const hourly = until.getTime() - since.getTime() <= HOURLY_MAX_SPAN_MS;
  const step = hourly ? HOUR_MS : DAY_MS;
  const first = new Date(since);
  if (hourly) first.setMinutes(0, 0, 0);
  else first.setHours(0, 0, 0, 0);
  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  const keyOf = (d: Date) =>
    hourly ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

/** @deprecated Use PageStatsRow. */
export type PageRow = { path: string; title: string; views: number; visitors: number; avgTimeMs: number; avgScroll: number };

/** @deprecated Use buildReport().pages. */
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
    row.scroll += numberOf(view.scrollDepth) ?? 0;
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
    .sort((a, b) => b.views - a.views || compareText(a.path, b.path))
    .slice(0, limit);
}

/** @deprecated Use BreakdownRow. */
export type CountRow = { label: string; count: number; share: number };

/** @deprecated Use buildReport().sessions (landing = first page of each session). */
export function sessionLandings(views: View[]): View[] {
  const firsts = new Map<string, View>();
  for (const view of views) {
    const key = view.sessionId || `doc:${view.id}`;
    const existing = firsts.get(key);
    const index = numberOf(view.pageIndex) ?? 0;
    const existingIndex = existing ? (numberOf(existing.pageIndex) ?? 0) : 0;
    if (!existing || index < existingIndex || (index === existingIndex && view.createdAt < existing.createdAt)) {
      firsts.set(key, view);
    }
  }
  return [...firsts.values()];
}

/** @deprecated Use buildReport().audience / channels. */
export function bySession(landings: View[], pick: (view: View) => string | undefined, limit = 20): CountRow[] {
  const counts = new Map<string, number>();
  for (const view of landings) {
    const label = (pick(view) || "").trim() || UNKNOWN;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: ratio(count, landings.length) }))
    .sort((a, b) => b.count - a.count || compareText(a.label, b.label))
    .slice(0, limit);
}

/** @deprecated Use hostOf() / classifyChannel() from lib/analytics/channels. */
export function referrerHost(referrer: string | undefined): string {
  if (!referrer) return "Direct / none";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || "Direct / none";
  } catch {
    return referrer;
  }
}

/** @deprecated Use buildReport().campaigns. */
export function utmLabel(view: View): string {
  if (!view.utmSource && !view.utmMedium && !view.utmCampaign) return "";
  return [view.utmSource || "-", view.utmMedium || "-", view.utmCampaign || "-"].join(" / ");
}

/** @deprecated Use buildReport().behaviour. */
export type EventRow = { type: string; label: string; count: number };

/** @deprecated Use buildReport().behaviour. */
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
