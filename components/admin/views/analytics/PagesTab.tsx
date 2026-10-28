"use client";

import { useMemo, useState } from "react";
import { DEFINITIONS, SCROLL_BUCKETS, formatDuration, formatNumber, formatPercent, type PageStatsRow, type ScrollRow } from "@/lib/analytics/report";
import { BarChart, sequential } from "../../charts";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  DeltaText,
  EmptyState,
  KpiTile,
  SearchField,
  SkeletonCard,
  cx,
  kpiDelta,
  numberDelta,
  type Column,
  type Delta,
  TableCard,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { matchesQuery } from "../../data/records";
import { kpiText, pageTotals } from "../../data/analytics";

/**
 * Analytics > Pages: every page with views, visitors, entries, exits, time, scroll, bounce and exit
 * rate (plus the change in views against the previous period), the page-view CSV export (same
 * columns as the old dashboard) and the scroll-depth distribution: overall buckets and a 100% bar
 * per top page, in one ordinal sequential scale so deeper reading reads as more ink.
 */

/** Ordinal shades for the 4 scroll buckets (light = stopped early, full accent = read to the end). */
const BUCKET_COLORS = [sequential(0.15), sequential(0.4), sequential(0.68), sequential(1)] as const;

const pct = (v: number | null) => (v === null ? "-" : formatPercent(v));

function PathCell({ row }: { row: Pick<PageStatsRow, "path" | "title"> }) {
  return (
    <span className="block min-w-0">
      <span className="block font-mono text-[0.75rem] text-fg [overflow-wrap:anywhere]">{row.path}</span>
      {row.title ? <span className="line-clamp-2 block text-[0.75rem] font-normal text-muted [overflow-wrap:anywhere]">{row.title}</span> : null}
    </span>
  );
}

export default function PagesTab() {
  const { report, previousReport, analyticsLoading, analytics, exportPageviews, rangeLabel } = useAdminData();
  const [query, setQuery] = useState("");

  const totals = useMemo(() => (report ? pageTotals(report.pages) : null), [report]);
  const prevTotals = useMemo(() => (previousReport ? pageTotals(previousReport.pages) : null), [previousReport]);
  const prevViews = useMemo(() => new Map((previousReport?.pages ?? []).map((p) => [p.path, p.views])), [previousReport]);
  const rows = useMemo(() => (report ? report.pages.filter((p) => matchesQuery(query, [p.path, p.title])) : []), [report, query]);

  if (!report || !totals) {
    return analyticsLoading ? (
      <div className="space-y-3" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiTile key={i} label="" value="" loading />
          ))}
        </div>
        <SkeletonCard lines={10} />
      </div>
    ) : (
      <Card padding="none">
        <EmptyState icon="file" title="No page views yet" description="Pages appear here once visits in this range are loaded." />
      </Card>
    );
  }

  const columns: Column<PageStatsRow>[] = [
    { key: "path", header: "Page", cell: (r) => <PathCell row={r} />, sortValue: (r) => r.path, mobile: "title" },
    { key: "views", header: "Views", align: "right", cell: (r) => formatNumber(r.views), sortValue: (r) => r.views, mobile: "badge" },
    {
      key: "change",
      header: "Change",
      align: "right",
      cell: (r) => {
        if (!previousReport) return <span className="text-muted">-</span>;
        const d = numberDelta(r.views, prevViews.get(r.path) ?? 0);
        return d ? <DeltaText delta={d} /> : <span className="text-muted">-</span>;
      },
      sortValue: (r) => {
        const before = prevViews.get(r.path) ?? 0;
        return before ? (r.views - before) / before : r.views ? Number.MAX_SAFE_INTEGER : 0;
      },
      hideBelow: "lg",
      mobileLabel: "Views vs prev.",
    },
    { key: "visitors", header: "Visitors", align: "right", cell: (r) => formatNumber(r.visitors), sortValue: (r) => r.visitors },
    { key: "entries", header: "Entries", align: "right", cell: (r) => formatNumber(r.entries), sortValue: (r) => r.entries, hideBelow: "md" },
    { key: "exits", header: "Exits", align: "right", cell: (r) => formatNumber(r.exits), sortValue: (r) => r.exits, hideBelow: "lg", mobile: "hidden" },
    { key: "time", header: "Avg. time", align: "right", cell: (r) => formatDuration(r.avgEngagedMs), sortValue: (r) => r.avgEngagedMs },
    { key: "scroll", header: "Scroll", align: "right", cell: (r) => (r.avgScroll === null ? "-" : `${Math.round(r.avgScroll)}%`), sortValue: (r) => r.avgScroll, mobileLabel: "Avg. scroll" },
    { key: "bounce", header: "Bounce", align: "right", cell: (r) => pct(r.bounceRate), sortValue: (r) => r.bounceRate, hideBelow: "lg" },
    { key: "exitRate", header: "Exit rate", align: "right", cell: (r) => pct(r.exitRate), sortValue: (r) => r.exitRate, hideBelow: "lg" },
  ];

  const scroll = report.behaviour.scrollDistribution;
  const overall = [0, 1, 2, 3].map((i) => scroll.reduce((sum, row) => sum + row.buckets[i], 0));
  const measured = overall.reduce((a, b) => a + b, 0);
  const prevScroll = prevTotals?.avgScroll ?? null;

  return (
    <div className={cx("min-w-0 space-y-3 transition-opacity", analyticsLoading && "opacity-60")} aria-busy={analyticsLoading}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&_span.truncate]:whitespace-normal">
        <KpiTile label="Page views" icon="eye" value={kpiText(report.kpis.pageviews)} delta={kpiDelta(report.kpis.pageviews)} hint={DEFINITIONS.pageview} />
        <KpiTile
          label="Distinct pages"
          icon="file"
          value={formatNumber(totals.paths)}
          delta={prevTotals ? numberDelta(totals.paths, prevTotals.paths) : null}
          hint="Distinct pages (paths) with at least one view in this range."
        />
        <KpiTile
          label="Avg. time on page"
          icon="clock"
          value={totals.views ? formatDuration(totals.avgMsPerView) : "-"}
          delta={prevTotals && prevTotals.views ? numberDelta(totals.avgMsPerView, prevTotals.avgMsPerView) : null}
          hint={`${DEFINITIONS.engagedTime} Averaged over page views (mm:ss).`}
        />
        <KpiTile
          label="Avg. scroll"
          icon="scroll"
          value={totals.avgScroll === null ? "-" : `${Math.round(totals.avgScroll)}%`}
          delta={totals.avgScroll !== null && prevScroll !== null ? numberDelta(totals.avgScroll, prevScroll) : null}
          hint={DEFINITIONS.scrollDepth}
        />
      </div>

      <TableCard
        title="All pages"
        icon="file"
        hint={`Entries: ${DEFINITIONS.entries} Exits: ${DEFINITIONS.exits} Exit rate: ${DEFINITIONS.exitRate} Bounce: of the sessions that started on the page, the share that was not engaged.`}
        description={`${formatNumber(report.pages.length)} pages · last ${rangeLabel}`}
        actions={
          <span className="hidden sm:block">
            <Button size="sm" icon="download" onClick={exportPageviews} disabled={!analytics || report.kpis.pageviews.value === 0}>
              Export page views
            </Button>
          </span>
        }
        toolbar={
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField value={query} onChange={setQuery} placeholder="Search path or title" label="Search pages" className="min-w-0 sm:max-w-xs sm:flex-1" />
            <span className="sm:hidden">
              <Button icon="download" block onClick={exportPageviews} disabled={!analytics || report.kpis.pageviews.value === 0}>
                Export page views (CSV)
              </Button>
            </span>
          </div>
        }
      >
        <DataTable
          bare
          caption="Page statistics"
          rows={rows}
          rowKey={(r) => r.path}
          columns={columns}
          renderCard={(r) => <PageCard row={r} delta={previousReport ? numberDelta(r.views, prevViews.get(r.path) ?? 0) : null} />}
          initialSort={{ key: "views", dir: "desc" }}
          pageSize={25}
          resetKey={query}
          empty={<EmptyState compact icon="search" title={query ? "No matching pages" : "No page views in this range"} />}
        />
      </TableCard>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader title="How far people scroll" icon="scroll" hint={DEFINITIONS.scrollDepth} description="Page views of the top pages by deepest point seen" />
          {measured ? (
            <>
              <BarChart
                ariaLabel="Page views by scroll depth"
                valueLabel="Page views"
                height={200}
                data={SCROLL_BUCKETS.map((label, i) => ({ key: label, label, longLabel: `Scrolled ${label} of the page`, value: overall[i], highlight: i === 3 }))}
              />
              <p className="mt-3 text-[0.8125rem] text-muted">
                <span className="font-mono tabular-nums text-fg">{formatPercent(overall[3] / measured)}</span> of measured views reached the last quarter of the page.
              </p>
            </>
          ) : (
            <EmptyState compact icon="scroll" title="No scroll depth measured" />
          )}
        </Card>
        <Card>
          <CardHeader title="Scroll depth by page" icon="layers" description="Share of each page's views per depth band (10 most viewed pages)" />
          {scroll.length ? (
            <>
              <ScrollLegend />
              <ul className="mt-3 space-y-4">
                {scroll.map((row) => (
                  <ScrollItem key={row.path} row={row} />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState compact icon="scroll" title="No scroll depth measured" />
          )}
        </Card>
      </div>
    </div>
  );
}

function ScrollLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] text-muted" aria-label="Scroll depth bands">
      {SCROLL_BUCKETS.map((label, i) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] border border-line" style={{ backgroundColor: BUCKET_COLORS[i] }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function ScrollItem({ row }: { row: ScrollRow }) {
  const [active, setActive] = useState<number | null>(null);
  const total = row.buckets.reduce((a, b) => a + b, 0);
  const share = (v: number) => (total ? formatPercent(v / total) : "-");
  const summary = SCROLL_BUCKETS.map((label, i) => `${label}: ${formatNumber(row.buckets[i])} (${share(row.buckets[i])})`).join(", ");
  return (
    <li className="min-w-0">
      <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-[0.75rem] text-fg">{row.path}</span>
        <span className="shrink-0 font-mono text-[0.75rem] tabular-nums text-muted" aria-hidden="true">
          {active !== null
            ? `${SCROLL_BUCKETS[active]} · ${formatNumber(row.buckets[active])} (${share(row.buckets[active])})`
            : `${row.avgScroll === null ? "-" : `${Math.round(row.avgScroll)}% avg.`} · ${formatNumber(row.measured)} views`}
        </span>
      </div>
      <div role="img" aria-label={`Scroll depth on ${row.path}: ${summary}`} className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-fg/[0.05]">
        {row.buckets.map((value, i) =>
          value > 0 ? (
            <span
              key={i}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              className={cx("h-full transition-opacity first:rounded-l-full last:rounded-r-full", active !== null && active !== i && "opacity-40")}
              style={{ flexGrow: value, flexBasis: 0, minWidth: 3, backgroundColor: BUCKET_COLORS[i] }}
            />
          ) : null,
        )}
      </div>
    </li>
  );
}

/** Compact phone card: path + views (and change), then one wrapping line with the other figures. */
function PageCard({ row, delta }: { row: PageStatsRow; delta: Delta | null }) {
  const stat = (value: string, label: string) => (
    <span className="whitespace-nowrap">
      <span className="font-mono tabular-nums text-fg">{value}</span> {label}
    </span>
  );
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PathCell row={row} />
        </div>
        <div className="shrink-0 text-right">
          <span className="font-mono text-[0.9375rem] tabular-nums text-fg">{formatNumber(row.views)}</span>
          <span className="text-[0.75rem] text-muted"> views</span>
          {delta ? (
            <span className="block">
              <DeltaText delta={delta} />
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-muted">
        {stat(formatNumber(row.visitors), "visitors")}
        {stat(formatDuration(row.avgEngagedMs), "avg. time")}
        {stat(row.avgScroll === null ? "-" : `${Math.round(row.avgScroll)}%`, "scroll")}
        {stat(formatNumber(row.entries), "entries")}
        {stat(formatNumber(row.exits), "exits")}
        {stat(pct(row.bounceRate), "bounce")}
        {stat(pct(row.exitRate), "exit rate")}
      </p>
    </div>
  );
}
