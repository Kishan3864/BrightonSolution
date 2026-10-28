"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { buildReport, DEFINITIONS, formatNumber, formatPercent, type TimelineBucket } from "@/lib/analytics/report";
import { LAUNCH_PATH } from "@/lib/site";
import {
  AdminIcon,
  Button,
  Card,
  CardHeader,
  EmptyState,
  KpiTile,
  LinkButton,
  Notice,
  PageHeader,
  Section,
  Segmented,
  Skeleton,
  TONE_DOT,
  cx,
  eyebrow,
  focusRing,
  kpiDelta,
  numberDelta,
  type AdminIconName,
} from "../kit";
import { BarList, Sparkline, StackedBar, TimeSeriesChart, timelinePoints } from "../charts";
import { useAdminData, type QuickPeriod } from "../data/AdminDataProvider";
import {
  CONTACT_STATUS_META,
  CONTACT_STATUSES,
  LEAD_STATUS_META,
  LEAD_STATUSES,
  contactStatusOf,
  leadStatusOf,
  timeAgo,
  timeOf,
} from "../data/records";
import type { InboxItem } from "../data/types";
import { routes } from "../shell/router";
import { InboxRow } from "../shell/TopBar";

/**
 * Overview: the admin's home screen (and the installed app's start page on a phone).
 * Top to bottom on a phone: alerts prompt, "new since your last visit" banner, one card per enquiry
 * source (waiting count + status pipeline), the merged latest-enquiries feed grouped by day, the
 * 24 h / 7 day KPIs with sparklines, then trend, traffic channels and alert status. On wide content
 * (container >= 56rem) the KPIs move above a two-column feed | side split.
 */

const DAY = 86_400_000;
const PERIOD_KEY = "bs_admin_overview_period";
const FEED_FIRST = 8;
const FEED_STEP = 12;

type PeriodKey = "today" | "week";
type FeedFilter = "all" | "new" | "contact" | "landing";
type TrendMetric = "visitors" | "sessions" | "views";

const PERIODS: Record<PeriodKey, { label: string; long: string; previous: string }> = {
  today: { label: "24 hours", long: "Last 24 hours", previous: "vs previous 24 h" },
  week: { label: "7 days", long: "Last 7 days", previous: "vs previous 7 days" },
};

const HINT = {
  contacts: "Website contact-form submissions in the period, spam left out.",
  leads: `Leads from the private landing page ${LAUNCH_PATH} in the period, spam left out.`,
  conversion: `Landing leads divided by the visitors of ${LAUNCH_PATH} in the same period.`,
};

export default function OverviewView() {
  const { counts, now, notifications } = useAdminData();
  const [period, setPeriod] = useStoredPeriod();
  const today = new Date(now);
  const hour = today.getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const waiting = counts.unread;

  return (
    <div className="@container min-w-0">
      <PageHeader
        eyebrow={today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        title="Overview"
        description={
          <>
            {greeting}.{" "}
            {waiting > 0 ? (
              <>
                <span className="text-fg">{formatNumber(waiting)}</span> {waiting === 1 ? "enquiry is" : "enquiries are"} waiting for a reply.
              </>
            ) : (
              "You are all caught up, nothing is waiting for a reply."
            )}
          </>
        }
      />

      {notifications.permission === "default" ? <AlertsPrompt /> : null}
      <SinceLastVisit />

      <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-5 @4xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] @4xl:gap-y-7">
        <div className="order-1 grid min-w-0 gap-3 @lg:grid-cols-2 @4xl:col-span-2">
          <SourceCard source="contact" />
          <SourceCard source="landing" />
        </div>
        <div className="order-2 min-w-0 @4xl:order-3">
          <LatestFeed />
        </div>
        <div className="order-3 min-w-0 @4xl:order-2 @4xl:col-span-2">
          <PeriodKpis period={period} onPeriod={setPeriod} />
        </div>
        <div className="order-4 grid min-w-0 content-start gap-3 @2xl:grid-cols-2 @4xl:grid-cols-1">
          <TrendCard period={period} />
          <ChannelsCard period={period} />
          {notifications.permission !== "default" ? <AlertsCard /> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

/** Remembers the 24 h / 7 day choice per browser (best effort). */
function useStoredPeriod(): [PeriodKey, (period: PeriodKey) => void] {
  const [period, setPeriod] = useState<PeriodKey>("today");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PERIOD_KEY);
      if (stored === "today" || stored === "week") setPeriod(stored);
    } catch {
      /* storage blocked */
    }
  }, []);
  const update = (next: PeriodKey) => {
    setPeriod(next);
    try {
      window.localStorage.setItem(PERIOD_KEY, next);
    } catch {
      /* storage blocked */
    }
  };
  return [period, update];
}

/** Non-spam docs per timeline bucket (sparklines for contacts and leads). */
function perBucket(docs: readonly { createdAt?: Date | null; status?: string }[], buckets: readonly TimelineBucket[]): number[] {
  return buckets.map((bucket) => {
    const start = bucket.start.getTime();
    const end = bucket.end.getTime();
    let n = 0;
    for (const doc of docs) {
      const t = timeOf(doc);
      if (t >= start && t < end && doc.status !== "spam") n += 1;
    }
    return n;
  });
}

/** matchMedia as state (false until mounted). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** "Today", "Yesterday" or "Sun 25 Oct" for the feed's day headers. */
function dayLabel(date: Date | null, now: number): string {
  if (!date) return "Date unknown";
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const ref = new Date(now);
  ref.setHours(0, 0, 0, 0);
  const diff = Math.round((ref.getTime() - day.getTime()) / DAY);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === ref.getFullYear() ? undefined : "numeric",
  });
}

function plural(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

/* ----------------------------------------------------------- top messages */

/** Shown while the browser has not been asked yet: the owner's main reason to use the app. */
function AlertsPrompt() {
  const { notifications } = useAdminData();
  const [busy, setBusy] = useState(false);
  return (
    <Notice
      className="mb-5"
      title="Turn on instant alerts"
      action={
        <Button
          variant="primary"
          size="sm"
          icon="bell"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await notifications.request();
            } finally {
              setBusy(false);
            }
          }}
        >
          Turn on alerts
        </Button>
      }
    >
      Get a notification with the name, plan and phone number the moment someone sends either form.
    </Notice>
  );
}

/** "N new since your last visit" with a link per source and "Mark as seen". */
function SinceLastVisit() {
  const { counts, lastSeen, markSeen, now } = useAdminData();
  const leads = counts.leadsSinceLastVisit;
  const contacts = counts.contactsSinceLastVisit;
  const total = leads + contacts;
  if (total === 0) return null;
  const since = Math.min(...[lastSeen.contacts, lastSeen.leads].filter((t) => t > 0));
  return (
    <section
      aria-label="New since your last visit"
      className="relative mb-5 overflow-hidden rounded-[var(--radius-card)] border border-accent/45 bg-[linear-gradient(120deg,rgba(237,148,59,0.16),rgba(237,180,59,0.05)_55%,transparent)] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 @4xl:flex-row @4xl:items-center @4xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-canvas">
            <AdminIcon name="sparkles" size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.0625rem] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[1.25rem]">
              {plural(total, "new enquiry", "new enquiries")} since your last visit
            </p>
            <p className="mt-1 text-[0.8125rem] text-muted">
              {[leads ? plural(leads, "landing lead", "landing leads") : "", contacts ? plural(contacts, "contact", "contacts") : ""]
                .filter(Boolean)
                .join(" and ")}
              {Number.isFinite(since) ? <> · last visit {timeAgo(new Date(since), now)}</> : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 @md:pl-[52px] @4xl:pl-0">
          {leads ? (
            <LinkButton href={routes.landing()} variant="primary" size="sm" icon="rocket">
              {plural(leads, "lead", "leads")}
            </LinkButton>
          ) : null}
          {contacts ? (
            <LinkButton href={routes.contacts()} variant={leads ? "secondary" : "primary"} size="sm" icon="mail">
              {plural(contacts, "contact", "contacts")}
            </LinkButton>
          ) : null}
          <Button size="sm" variant="ghost" icon="check" onClick={markSeen}>
            Mark as seen
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ source cards */

/** One card per enquiry source: waiting count (link to the list), totals and the status pipeline. */
function SourceCard({ source }: { source: "contact" | "landing" }) {
  const { contacts, leads, counts, inboxLoaded, now } = useAdminData();
  const isContact = source === "contact";
  const docs = isContact ? contacts : leads;
  const waiting = isContact ? counts.newContacts : counts.newLeads;
  const href = isContact ? routes.contacts() : routes.landing();
  const title = isContact ? "Contacts" : "Landing page";
  const icon: AdminIconName = isContact ? "mail" : "rocket";
  const origin = isContact ? "Website contact form" : `Private page ${LAUNCH_PATH}`;
  const latest = docs[0]?.createdAt ?? null;
  const last24 = docs.filter((doc) => timeOf(doc) > now - DAY).length;

  const segments = useMemo(() => {
    if (isContact) {
      const tally = new Map<string, number>();
      for (const doc of contacts) tally.set(contactStatusOf(doc), (tally.get(contactStatusOf(doc)) ?? 0) + 1);
      return CONTACT_STATUSES.map((s) => ({ key: s, label: CONTACT_STATUS_META[s].label, value: tally.get(s) ?? 0, color: TONE_DOT[CONTACT_STATUS_META[s].tone] }));
    }
    const tally = new Map<string, number>();
    for (const doc of leads) tally.set(leadStatusOf(doc), (tally.get(leadStatusOf(doc)) ?? 0) + 1);
    return LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_META[s].label, value: tally.get(s) ?? 0, color: TONE_DOT[LEAD_STATUS_META[s].tone] }));
  }, [isContact, contacts, leads]);

  return (
    <Card padding="none" aria-label={title}>
      <a
        href={href}
        aria-label={`${title}: ${plural(waiting, "enquiry", "enquiries")} waiting for a reply`}
        className={cx("group block rounded-t-[var(--radius-card)] p-4 pb-3 transition-colors hover:bg-fg/[0.03] sm:p-5 sm:pb-3", focusRing)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={cx(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-[0.6rem]",
              isContact ? "bg-[#7fb4ff]/12 text-[#9cc5ff]" : "bg-accent/14 text-accent",
            )}
          >
            <AdminIcon name={icon} size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">{title}</span>
            <span className="block truncate text-[0.75rem] text-muted">{origin}</span>
          </span>
          <AdminIcon name="chevronRight" size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </span>
        {inboxLoaded ? (
          <span className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cx(
                "font-mono text-[2.25rem] font-medium leading-none tracking-[-0.04em] tabular-nums",
                waiting > 0 ? "text-accent" : "text-fg",
              )}
            >
              {formatNumber(waiting)}
            </span>
            <span className="text-[0.875rem] text-muted">{waiting > 0 ? "waiting for a reply" : "all answered"}</span>
          </span>
        ) : (
          <Skeleton className="mt-4 h-9 w-24" />
        )}
        <span className="mt-2 block truncate text-[0.75rem] text-muted">
          {inboxLoaded ? (
            <>
              <span className="font-mono tabular-nums text-fg">{formatNumber(docs.length)}</span> total ·{" "}
              <span className="font-mono tabular-nums text-fg">{formatNumber(last24)}</span> in 24 h
              {latest ? <> · latest {timeAgo(latest, now)}</> : null}
            </>
          ) : (
            "Loading…"
          )}
        </span>
      </a>
      <div className="border-t border-line px-4 pt-3 pb-3 sm:px-5 sm:pb-4">
        {inboxLoaded ? (
          docs.length ? (
            <StackedBar segments={segments} height={8} ariaLabel={`${title} by status`} />
          ) : (
            <p className="py-1 text-[0.8125rem] text-muted">No {isContact ? "contact-form submissions" : "landing leads"} yet.</p>
          )
        ) : (
          <Skeleton className="h-10 w-full" />
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------- feed */

const FEED_FILTERS: { value: FeedFilter; label: string; title: string }[] = [
  { value: "all", label: "All", title: "Every enquiry, newest first" },
  { value: "new", label: "New", title: "Waiting for a reply" },
  { value: "contact", label: "Contacts", title: "Website contact form only" },
  { value: "landing", label: "Landing", title: "Landing page only" },
];

/** Merged contacts + landing leads, newest first, grouped by day, with "Show more". */
function LatestFeed() {
  const { inbox, inboxLoaded, inboxLoading, inboxError, refresh, now } = useAdminData();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [limit, setLimit] = useState(FEED_FIRST);
  const titleId = useId();

  const rows = useMemo(
    () =>
      inbox.filter((item) =>
        filter === "all" ? true : filter === "new" ? item.status === "new" : item.source === filter,
      ),
    [inbox, filter],
  );
  const shown = rows.slice(0, limit);
  const groups = useMemo(() => {
    const out: { label: string; items: InboxItem[] }[] = [];
    for (const item of shown) {
      const label = dayLabel(item.createdAt, now);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [shown, now]);

  return (
    <Card padding="none" aria-labelledby={titleId} className="flex flex-col">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <CardHeader
          id={titleId}
          title="Latest enquiries"
          description="Contact form and landing page together, newest first"
          icon="inbox"
          className="mb-3"
        />
        <div className="@container">
          <Segmented
            options={FEED_FILTERS}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setLimit(FEED_FIRST);
            }}
            ariaLabel="Show enquiries from"
            size="sm"
            className="w-full @sm:w-auto [&>button]:flex-1 @sm:[&>button]:flex-none"
          />
        </div>
      </div>

      <div className="mt-2 flex-1 px-2 pb-2 sm:px-3">
        {inboxError && !inboxLoaded ? (
          <Notice
            tone="error"
            role="alert"
            className="m-2"
            title="Enquiries could not be loaded"
            action={
              <Button size="sm" icon="refresh" onClick={() => void refresh()}>
                Try again
              </Button>
            }
          >
            {inboxError}
          </Notice>
        ) : !inboxLoaded ? (
          <ul aria-busy={inboxLoading || undefined} aria-label="Loading enquiries">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-start gap-3 px-2.5 py-2.5">
                <Skeleton className="mt-1 size-2 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-3 w-12" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            icon={filter === "new" ? "check" : "inbox"}
            title={inbox.length === 0 ? "No enquiries yet" : filter === "new" ? "Nothing is waiting for a reply" : "Nothing here yet"}
            description={
              inbox.length === 0
                ? "Contact-form submissions and landing page leads will appear here the moment they arrive."
                : filter === "new"
                  ? "Every enquiry has been handled. New ones show up here first."
                  : "No enquiries from this source so far."
            }
          />
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="mt-1 first:mt-0">
              <h3 className={cx(eyebrow, "sticky top-0 z-[1] bg-surface px-2.5 pt-2 pb-1")}>{group.label}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={`${item.source}-${item.id}`}>
                    <InboxRow item={item} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {inboxLoaded && rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-5">
          <p className="text-[0.75rem] text-muted">
            Showing <span className="font-mono tabular-nums text-fg">{formatNumber(shown.length)}</span> of{" "}
            <span className="font-mono tabular-nums text-fg">{formatNumber(rows.length)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {rows.length > shown.length ? (
              <Button size="sm" variant="secondary" icon="chevronDown" onClick={() => setLimit((n) => n + FEED_STEP)}>
                Show more
              </Button>
            ) : null}
            {filter === "contact" || filter === "landing" ? (
              <LinkButton size="sm" variant="ghost" iconRight="arrowRight" href={filter === "contact" ? routes.contacts() : routes.landing()}>
                Open {filter === "contact" ? "contacts" : "landing leads"}
              </LinkButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/* ---------------------------------------------------------------------- KPIs */

/** Visitors, sessions, page views, contacts, landing leads and landing conversion for 24 h or 7 days. */
function PeriodKpis({ period, onPeriod }: { period: PeriodKey; onPeriod: (p: PeriodKey) => void }) {
  const { quick, analyticsLoading, analyticsError, refresh, contacts, leads } = useAdminData();
  const q: QuickPeriod | null = quick ? quick[period] : null;
  const meta = PERIODS[period];
  const loading = !q && (analyticsLoading || !analyticsError);

  const series = useMemo(() => {
    if (!q) return null;
    const t = q.report.timeline;
    return {
      visitors: t.map((b) => b.visitors),
      sessions: t.map((b) => b.sessions),
      views: t.map((b) => b.views),
      contacts: perBucket(contacts, t),
      leads: perBucket(leads, t),
    };
  }, [q, contacts, leads]);

  const landingVisitors = q?.report.pages.find((row) => row.path === LAUNCH_PATH)?.visitors ?? 0;
  const conversion = q && landingVisitors > 0 ? q.leads / landingVisitors : null;
  const k = q?.report.kpis;
  // On the narrowest phones the label needs the icon's room.
  const roomy = useMediaQuery("(min-width: 400px)");
  const ic = (name: AdminIconName): AdminIconName | undefined => (roomy ? name : undefined);
  const dash = "-";

  return (
    <Section
      title="At a glance"
      description={`${meta.long}, compared with the period before`}
      actions={
        <Segmented
          options={(Object.keys(PERIODS) as PeriodKey[]).map((key) => ({ value: key, label: PERIODS[key].label, title: PERIODS[key].long }))}
          value={period}
          onChange={onPeriod}
          ariaLabel="Period"
          size="sm"
        />
      }
    >
      {analyticsError && !q ? (
        <Notice
          tone="error"
          role="alert"
          className="mb-3"
          title="Traffic figures could not be loaded"
          action={
            <Button size="sm" icon="refresh" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        >
          {analyticsError}
        </Notice>
      ) : null}
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @6xl:grid-cols-6">
        <KpiTile
          label="Visitors"
          icon={ic("users")}
          value={k ? formatNumber(k.visitors.value) : dash}
          delta={kpiDelta(k?.visitors)}
          deltaSuffix={meta.previous}
          hint={DEFINITIONS.visitor}
          loading={loading}
          href={routes.analytics("audience")}
          sparkline={series ? <Sparkline values={series.visitors} height={28} /> : null}
        />
        <KpiTile
          label="Sessions"
          icon={ic("activity")}
          value={k ? formatNumber(k.sessions.value) : dash}
          delta={kpiDelta(k?.sessions)}
          deltaSuffix={meta.previous}
          hint={DEFINITIONS.session}
          loading={loading}
          href={routes.analytics("sessions")}
          sparkline={series ? <Sparkline values={series.sessions} height={28} /> : null}
        />
        <KpiTile
          label="Page views"
          icon={ic("eye")}
          value={k ? formatNumber(k.pageviews.value) : dash}
          delta={kpiDelta(k?.pageviews)}
          deltaSuffix={meta.previous}
          hint={DEFINITIONS.pageview}
          loading={loading}
          href={routes.analytics("pages")}
          sparkline={series ? <Sparkline values={series.views} height={28} /> : null}
        />
        <KpiTile
          label="Contacts"
          icon={ic("mail")}
          value={q ? formatNumber(q.contacts) : dash}
          delta={q ? numberDelta(q.contacts, q.contactsPrevious) : null}
          deltaSuffix={meta.previous}
          hint={HINT.contacts}
          loading={loading}
          href={routes.contacts()}
          sparkline={series ? <Sparkline values={series.contacts} height={28} /> : null}
        />
        <KpiTile
          label="Leads"
          icon={ic("rocket")}
          value={q ? formatNumber(q.leads) : dash}
          delta={q ? numberDelta(q.leads, q.leadsPrevious) : null}
          deltaSuffix={meta.previous}
          hint={HINT.leads}
          loading={loading}
          href={routes.landing()}
          sparkline={series ? <Sparkline values={series.leads} height={28} /> : null}
        />
        <KpiTile
          label="Conversion"
          icon={ic("target")}
          value={conversion === null ? dash : formatPercent(conversion, 1)}
          hint={HINT.conversion}
          loading={loading}
          href={routes.landing()}
          sub={q ? `${plural(q.leads, "lead", "leads")} / ${plural(landingVisitors, "visitor", "visitors")}` : undefined}
          sparkline={
            conversion === null ? null : (
              <span className="block h-[28px] pt-[10px]" aria-hidden="true">
                <span className="block h-2 overflow-hidden rounded-full bg-fg/[0.07]">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, conversion * 100)}%` }} />
                </span>
              </span>
            )
          }
        />
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- side cards */

const TREND_OPTIONS: { value: TrendMetric; label: string }[] = [
  { value: "visitors", label: "Visitors" },
  { value: "sessions", label: "Sessions" },
  { value: "views", label: "Views" },
];

/** Hourly (24 h) or daily (7 days) trend with the previous period dashed. */
function TrendCard({ period }: { period: PeriodKey }) {
  const { quick, analytics, contacts, settings } = useAdminData();
  const [metric, setMetric] = useState<TrendMetric>("visitors");
  const q = quick ? quick[period] : null;
  const titleId = useId();

  // The provider only builds the previous period's report for the selected range; build this one here.
  const previous = useMemo(() => {
    if (!q || !analytics) return null;
    const span = q.report.until.getTime() - q.report.since.getTime();
    const until = q.report.since;
    const since = new Date(until.getTime() - span);
    if (since.getTime() < analytics.loadedFrom.getTime()) return null;
    return buildReport({
      pageviews: analytics.pageviews,
      events: analytics.events,
      contacts,
      since,
      until,
      excludedVisitors: new Set(settings.excludedVisitors),
    }).timeline;
  }, [q, analytics, contacts, settings.excludedVisitors]);

  const label = TREND_OPTIONS.find((o) => o.value === metric)?.label ?? "Visitors";
  const longLabel = metric === "views" ? "Page views" : label;

  return (
    <Card aria-labelledby={titleId} className="@2xl:col-span-2 @4xl:col-span-1">
      <CardHeader id={titleId} title="Traffic trend" description={`${PERIODS[period].long}, ${period === "today" ? "per hour" : "per day"}`} icon="trendUp" />
      <Segmented options={TREND_OPTIONS} value={metric} onChange={setMetric} ariaLabel="Trend metric" size="sm" className="mb-3" />
      {q ? (
        <TimeSeriesChart
          ariaLabel={`${longLabel} ${period === "today" ? "per hour, last 24 hours" : "per day, last 7 days"}, with the previous period`}
          points={timelinePoints(q.report.timeline, metric, previous)}
          series={[
            { key: "current", label: longLabel, area: true },
            { key: "previous", label: "Previous period", dashed: true },
          ]}
          height={190}
          showLegend
        />
      ) : (
        <Skeleton className="h-[190px] w-full" />
      )}
    </Card>
  );
}

/** Where the period's sessions came from (top channels). */
function ChannelsCard({ period }: { period: PeriodKey }) {
  const { quick } = useAdminData();
  const q = quick ? quick[period] : null;
  return (
    <Card>
      <CardHeader
        title="Traffic sources"
        description={`Sessions by channel, ${PERIODS[period].long.toLowerCase()}`}
        icon="link"
        hint={DEFINITIONS.channel}
        actions={<LinkButton href={routes.analytics("acquisition")} size="sm" variant="ghost" iconRight="chevronRight" aria-label="Open acquisition analytics">More</LinkButton>}
      />
      {q ? (
        <BarList
          ariaLabel="Sessions by channel"
          rows={q.report.channels.map((row) => ({ key: row.channel, label: row.channel, value: row.sessions, share: row.share }))}
          limit={5}
          labelHeader="Channel"
          valueHeader="Sessions"
          empty="No visits in this period."
        />
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}

/** Alert status once the browser has answered: on (with a test), blocked or unsupported. */
function AlertsCard() {
  const { notifications } = useAdminData();
  const [busy, setBusy] = useState(false);
  const p = notifications.permission;
  const state =
    p === "granted"
      ? { icon: "bell" as const, tone: "text-[#8fe2b1] bg-[#6fd49a]/12", title: "Alerts are on", text: "This browser shows a notification for every new contact and landing lead while the admin is open." }
      : p === "denied"
        ? { icon: "bellOff" as const, tone: "text-[#ff8a7a] bg-[#ff8a7a]/12", title: "Alerts are blocked", text: "Allow notifications for this site in the browser's site settings, then reload the admin." }
        : { icon: "bellOff" as const, tone: "text-muted bg-fg/[0.06]", title: "Alerts are not available here", text: "This browser cannot show notifications. On an iPhone, add the admin to the Home Screen first." };
  return (
    <Card>
      <div className="flex min-w-0 items-start gap-3">
        <span className={cx("inline-flex size-9 shrink-0 items-center justify-center rounded-full", state.tone)}>
          <AdminIcon name={state.icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold text-fg">{state.title}</h2>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted text-pretty">{state.text}</p>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-muted">
            Alerts while the admin is closed arrive with the installable admin app at admin.brightonsolution.com.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p === "granted" ? (
              <Button
                size="sm"
                icon="send"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await notifications.test();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Send a test
              </Button>
            ) : null}
            <LinkButton href={routes.settings()} size="sm" variant="ghost" icon="settings">
              Alert settings
            </LinkButton>
          </div>
        </div>
      </div>
    </Card>
  );
}
