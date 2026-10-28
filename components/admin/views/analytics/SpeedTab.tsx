"use client";

import type { ReactNode } from "react";
import { DEFINITIONS, formatDateTime, formatNumber, type DataNotes, type SpeedRow } from "@/lib/analytics/report";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  AdminIcon,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  KpiTile,
  StatusPill,
  cx,
  kpiDelta,
  numberDelta,
  type Column,
  MiniStat,
} from "../../kit";
import { deviceIcon, formatLoad, speedRating } from "../../data/analytics";
import { TabFallback } from "./TabFallback";

/**
 * Analytics > Speed & data. Page load times (median and p75) overall, by device and by landing page,
 * each with a plain Fast / Fair / Slow rating; then the data behind every figure: the loaded period,
 * record counts, what was merged, excluded or could not be matched (report.dataNotes) in plain
 * English, partial-data warnings, and the page-view CSV export (same columns as the old dashboard).
 */

const FAST_MS = 2500;
const FAIR_MS = 4000;

function RatingPill({ ms }: { ms: number | null }) {
  const rating = speedRating(ms);
  if (!rating) return <span className="text-[0.75rem] text-muted">-</span>;
  return (
    <StatusPill tone={rating.tone} size="sm">
      {rating.label}
    </StatusPill>
  );
}

/** Horizontal bars: solid = median, outlined extension to the tick = p75, on one shared scale with rating zones. */
function SpeedBars({ rows, icon }: { rows: readonly SpeedRow[]; icon?: (row: SpeedRow) => ReactNode }) {
  const measured = rows.filter((r) => r.medianMs !== null);
  if (!measured.length) return <p className="py-6 text-center text-[0.8125rem] text-muted">No load times measured in this range.</p>;
  const top = Math.max(FAIR_MS * 1.15, ...measured.map((r) => (r.p75Ms ?? r.medianMs ?? 0) * 1.08));
  const pct = (ms: number) => `${Math.min(100, (ms / top) * 100)}%`;
  return (
    <div className="min-w-0">
      <ol className="space-y-3" aria-label="Load time by group">
        {measured.map((row) => (
          <li key={row.key} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-[0.8125rem]">
              <span className="flex min-w-0 items-center gap-1.5">
                {icon?.(row)}
                <span className="truncate text-fg">{row.label}</span>
                <span className="shrink-0 text-[0.6875rem] text-muted">{formatNumber(row.samples)} loads</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 font-mono tabular-nums">
                <span className="text-fg">{formatLoad(row.medianMs)}</span>
                <span className="text-[0.75rem] text-muted">p75 {formatLoad(row.p75Ms)}</span>
              </span>
            </div>
            <div aria-hidden="true" className="relative h-3 overflow-hidden rounded-full bg-fg/[0.05]">
              {/* rating zones */}
              <span className="absolute inset-y-0 border-r border-dashed border-fg/20" style={{ left: 0, width: pct(FAST_MS) }} />
              <span className="absolute inset-y-0 border-r border-dashed border-fg/20" style={{ left: 0, width: pct(FAIR_MS) }} />
              {row.p75Ms !== null ? (
                <span className="absolute inset-y-[2px] left-0 rounded-full border border-accent/60 bg-accent/10" style={{ width: pct(row.p75Ms) }} />
              ) : null}
              <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(row.medianMs ?? 0) }} />
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-4 rounded-full bg-accent" /> Median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-4 rounded-full border border-accent/60 bg-accent/10" /> p75
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 border-r border-dashed border-fg/40" /> {formatLoad(FAST_MS)} and {formatLoad(FAIR_MS)} marks
        </span>
      </div>
    </div>
  );
}

type NoteRow = { key: keyof DataNotes; label: string; text: string; issue?: boolean };

const NOTE_GROUPS: { title: string; icon: Parameters<typeof AdminIcon>[0]["name"]; rows: NoteRow[] }[] = [
  {
    title: "Loaded from the database",
    icon: "download",
    rows: [
      { key: "pageviewDocs", label: "Page-view records", text: "Raw records fetched for this range, the comparison period and a short margin around them." },
      { key: "eventDocs", label: "Event records", text: "Raw click and form events fetched for the same period." },
      { key: "contactDocs", label: "Contact enquiries", text: "Website contact-form submissions available to match against visits (newest 1,000)." },
    ],
  },
  {
    title: "Counted in this range",
    icon: "check",
    rows: [
      { key: "pageviewsInRange", label: "Page views", text: "After merging resumed tabs and leaving out your own browsers. This is the page-view figure everywhere." },
      { key: "eventsInRange", label: "Events", text: "Clicks and form steps in the range from real visitors." },
      { key: "contactsInRange", label: "Enquiries received", text: "Contact-form submissions dated in the range, before removing spam." },
    ],
  },
  {
    title: "Left out or adjusted",
    icon: "filter",
    rows: [
      { key: "excludedPageviews", label: "Your team's page views", text: "From browsers on the excluded list (Settings), left out of every figure." },
      { key: "excludedEvents", label: "Your team's events", text: "Clicks from excluded browsers, left out." },
      { key: "excludedEnquiries", label: "Your team's enquiries", text: "Sent from an excluded browser: still listed under Contacts, never counted." },
      { key: "spamEnquiries", label: "Spam enquiries", text: "Marked as spam: still listed under Contacts, never counted." },
      { key: "mergedSegments", label: "Resumed tab records", text: "When someone leaves a tab and comes back, the extra records are merged so the page counts once." },
      { key: "contextPageviews", label: "Context page views", text: "Just outside the range; used only to complete visits that cross its start or end, never counted." },
    ],
  },
  {
    title: "Could not be fully matched",
    icon: "alert",
    rows: [
      { key: "partialSessions", label: "Partial sessions", text: DEFINITIONS.partialSession, issue: true },
      { key: "orphanEvents", label: "Events without a visit", text: "Their visit has no page view in the data, so they count in totals but are not attached to a session.", issue: true },
      { key: "unmatchedEnquiries", label: "Enquiries without a visit", text: "Could not be linked to a visit (tracking was off or blocked, or the form was sent from another tab).", issue: true },
      { key: "invalidDocs", label: "Records without a time", text: "Missing a readable timestamp, so they were ignored.", issue: true },
      { key: "legacyPageviews", label: "Older-format page views", text: "Recorded before page numbers existed, so their order inside a visit is approximate.", issue: true },
    ],
  },
];

export default function SpeedTab() {
  const { report, previousReport, analytics, truncated, rangeLabel, exportPageviews, analyticsLoading, purge } = useAdminData();
  if (!report) return <TabFallback cards={4} />;

  const { speed, kpis, dataNotes: notes } = report;
  const prevOverall = previousReport?.speed.overall ?? null;
  const slowest = speed.byDevice.filter((r) => r.medianMs !== null).sort((a, b) => (b.medianMs ?? 0) - (a.medianMs ?? 0))[0] ?? null;
  const overallRating = speedRating(speed.overall.medianMs);

  const pageColumns: Column<SpeedRow>[] = [
    {
      key: "page",
      header: "Page loaded",
      mobile: "title",
      sortValue: (r) => r.label,
      cell: (r) => <span className="font-mono text-[0.75rem] [overflow-wrap:anywhere]">{r.label}</span>,
    },
    { key: "rating", header: "Rating", mobile: "badge", width: "6.5rem", sortValue: (r) => r.medianMs, cell: (r) => <RatingPill ms={r.medianMs} /> },
    { key: "median", header: "Median", align: "right", width: "6.5rem", sortValue: (r) => r.medianMs, cell: (r) => formatLoad(r.medianMs) },
    { key: "p75", header: "p75", align: "right", width: "6.5rem", sortValue: (r) => r.p75Ms, cell: (r) => formatLoad(r.p75Ms) },
    { key: "samples", header: "Loads", align: "right", width: "5.5rem", sortValue: (r) => r.samples, cell: (r) => formatNumber(r.samples) },
  ];

  return (
    <div className="min-w-0">
      {/* ---------------------------------------------------------------- speed KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon="zap"
          label="Median load"
          value={kpis.medianLoadMs.measured ? formatLoad(kpis.medianLoadMs.value) : "-"}
          delta={kpiDelta(kpis.medianLoadMs, false)}
          sub={overallRating ? `${overallRating.label} · half the loads were faster` : "No loads measured"}
          hint={DEFINITIONS.loadTime}
          accent={overallRating?.tone === "red"}
        />
        <KpiTile
          icon="gauge"
          label="p75 load"
          value={formatLoad(speed.overall.p75Ms)}
          delta={speed.overall.p75Ms !== null && prevOverall?.p75Ms ? numberDelta(speed.overall.p75Ms, prevOverall.p75Ms, false) : null}
          sub="3 in 4 loads were faster"
          hint={DEFINITIONS.loadTime}
        />
        <KpiTile
          icon="activity"
          label="Measured loads"
          value={formatNumber(speed.overall.samples)}
          delta={prevOverall ? numberDelta(speed.overall.samples, prevOverall.samples) : null}
          sub="first page after opening the site"
        />
        <KpiTile
          icon={slowest ? deviceIcon(slowest.key) : "device"}
          label="Slowest device"
          value={slowest ? slowest.label : "-"}
          sub={slowest ? `median ${formatLoad(slowest.medianMs)}` : "No loads measured"}
        />
      </div>

      {/* ---------------------------------------------------------------- by device / by page */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader title="By device" icon="smartphone" hint={DEFINITIONS.loadTime} description={`Full page loads, ${rangeLabel}`} />
          <SpeedBars rows={[speed.overall, ...speed.byDevice]} icon={(row) => <AdminIcon name={row.key === speed.overall.key ? "globe" : deviceIcon(row.key)} size={14} className="shrink-0 text-muted" />} />
          <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">
            Fast under {formatLoad(FAST_MS)}, fair under {formatLoad(FAIR_MS)}, slow above. Measured on the first page shown after the site is opened or reloaded.
          </p>
        </Card>
        <Card padding="none">
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardHeader title="By landing page" icon="file" description="The page that was loaded in full (almost always where the visit started)" className="mb-2" />
          </div>
          <div className="p-2 sm:p-3">
            <DataTable
              bare
              dense
              caption="Load time by landing page"
              rows={speed.byLandingPage}
              columns={pageColumns}
              rowKey={(r) => r.key}
              renderCard={(r) => (
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <p className="min-w-0 font-mono text-[0.875rem] text-fg [overflow-wrap:anywhere]">{r.label}</p>
                    <RatingPill ms={r.medianMs} />
                  </div>
                  <p className="mt-1 font-mono text-[0.75rem] tabular-nums text-muted">
                    median <span className="text-fg">{formatLoad(r.medianMs)}</span> · p75 {formatLoad(r.p75Ms)} · {formatNumber(r.samples)} loads
                  </p>
                </div>
              )}
              initialSort={{ key: "samples", dir: "desc" }}
              pageSize={12}
              breakpoint="sm"
              empty={<EmptyState compact icon="zap" title="No load times" description="No full page loads were measured in this range." />}
            />
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- data */}
      <div className="mt-7 mb-3 min-w-0">
        <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-fg">About this data</h2>
        <p className="text-[0.8125rem] text-muted">What was loaded, what counts and what was left out, so every number on these pages can be trusted.</p>
      </div>

      {/* The "Partial data" notice for truncated loads sits above every tab (AnalyticsView); here it is a row. */}
      {truncated.length ? (
        <p className="mb-3 flex items-start gap-2 text-[0.8125rem] text-muted">
          <AdminIcon name="alert" size={14} className="mt-0.5 shrink-0 text-accent-2" />
          <span>Incomplete because of the record limit: {truncated.join(", ")}.</span>
        </p>
      ) : null}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader title="Loaded period" icon="calendar" hint={DEFINITIONS.times} />
          <dl className="space-y-3 text-[0.8125rem]">
            <div className="min-w-0">
              <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Selected range</dt>
              <dd className="mt-0.5 text-fg">
                {formatDateTime(report.since)} – {formatDateTime(report.until)}
              </dd>
            </div>
            {analytics ? (
              <>
                <div className="min-w-0">
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Compared with</dt>
                  <dd className="mt-0.5 text-fg">
                    {formatDateTime(analytics.prevSince)} – {formatDateTime(analytics.since)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Loaded</dt>
                  <dd className={cx("mt-0.5 text-fg", analyticsLoading && "opacity-60")}>
                    {formatDateTime(analytics.loadedAt)}
                    {analyticsLoading ? " (refreshing…)" : ""}
                  </dd>
                </div>
              </>
            ) : null}
            <div className="min-w-0">
              <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Time zone</dt>
              <dd className="mt-0.5 font-mono text-fg [overflow-wrap:anywhere]">
                {report.timeZone} · {report.unit === "hour" ? "hourly" : "daily"} buckets
              </dd>
            </div>
            {purge ? (
              <div className="min-w-0">
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Retention clean-up</dt>
                <dd className="mt-0.5 text-fg">
                  {formatNumber(purge.deleted)} expired records removed {formatDateTime(purge.at)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat label="Page views" value={formatNumber(notes.pageviewsInRange)} sub="counted" />
            <MiniStat label="Events" value={formatNumber(notes.eventsInRange)} sub="counted" />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <Button icon="download" block onClick={exportPageviews} disabled={!analytics?.pageviews.length}>
              Export page views (CSV)
            </Button>
            <p className="mt-2 text-[0.75rem] text-muted">Every raw page-view record of the selected range, one row each.</p>
          </div>
        </Card>

        <Card padding="none">
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardHeader title="Data notes" icon="info" description="Plain-English notes on how the figures were built" className="mb-1" />
          </div>
          <div className="divide-y divide-line">
            {NOTE_GROUPS.map((group) => (
              <section key={group.title} className="px-4 py-3 sm:px-5" aria-label={group.title}>
                <h3 className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
                  <AdminIcon name={group.icon} size={12} />
                  {group.title}
                </h3>
                <ul>
                  {group.rows.map((row) => {
                    const value = notes[row.key];
                    const flagged = row.issue && value > 0;
                    return (
                      <li key={row.key} className={cx("flex min-w-0 items-start justify-between gap-3 py-1.5", value === 0 && "opacity-60")}>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg">
                            {flagged ? <AdminIcon name="alert" size={13} className="shrink-0 text-accent-2" label="Needs attention" /> : null}
                            {row.label}
                          </p>
                          <p className="text-[0.75rem] leading-snug text-muted text-pretty">{row.text}</p>
                        </div>
                        <span className={cx("shrink-0 pt-0.5 font-mono text-[0.875rem] tabular-nums", flagged ? "text-accent-2" : "text-fg")}>
                          {formatNumber(value)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
