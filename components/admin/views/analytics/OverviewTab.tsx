"use client";

import { useMemo, useState } from "react";
import { DEFINITIONS, formatDuration, formatNumber, formatPercent, type Kpi, type Report } from "@/lib/analytics/report";
import { BarList, TimeSeriesChart, timelinePoints } from "../../charts";
import type { TimelineMetric } from "../../charts/timeline";
import {
  AdminIcon,
  Card,
  CardHeader,
  DeltaText,
  EmptyState,
  InfoTip,
  KpiTile,
  LinkButton,
  Skeleton,
  SkeletonCard,
  cx,
  eyebrow,
  kpiDelta,
  numberDelta,
  type AdminIconName,
  type Delta,
  ChannelDot,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { routes } from "../../shell/router";
import { kpiText, pageTotals } from "../../data/analytics";

/**
 * Analytics > Overview. The four headline figures double as the chart switch (Plausible-style):
 * tap one to plot it over time against the previous period (dashed). Below sit every other
 * ReportKpi with its change and definition, the old dashboard's KPIs (avg. time on page, new /
 * returning, tracked clicks) and the top channels and pages as quick links into the other tabs.
 */

type Headline = { metric: TimelineMetric; label: string; short: string; kpi: (r: Report) => Kpi; hint: string; icon: AdminIconName; series: string };

const HEADLINES: readonly Headline[] = [
  { metric: "visitors", label: "Unique visitors", short: "Visitors", kpi: (r) => r.kpis.visitors, hint: DEFINITIONS.visitor, icon: "users", series: "Visitors" },
  { metric: "sessions", label: "Sessions", short: "Sessions", kpi: (r) => r.kpis.sessions, hint: DEFINITIONS.session, icon: "layers", series: "Sessions" },
  { metric: "views", label: "Page views", short: "Page views", kpi: (r) => r.kpis.pageviews, hint: DEFINITIONS.pageview, icon: "eye", series: "Page views" },
  { metric: "enquiries", label: "Contact submissions", short: "Contacts", kpi: (r) => r.kpis.enquiries, hint: DEFINITIONS.enquiry, icon: "mail", series: "Contact submissions" },
];

export default function OverviewTab() {
  const { report, previousReport, analyticsLoading, rangeLabel } = useAdminData();
  const [metric, setMetric] = useState<TimelineMetric>("visitors");

  const totals = useMemo(() => (report ? pageTotals(report.pages) : null), [report]);

  if (!report) {
    return analyticsLoading ? <OverviewSkeleton /> : (
      <Card padding="none">
        <EmptyState icon="chart" title="No analytics yet" description="Figures appear here once the first visits of this range are loaded." />
      </Card>
    );
  }

  const k = report.kpis;
  const headline = HEADLINES.find((h) => h.metric === metric) ?? HEADLINES[0];
  const points = timelinePoints(report.timeline, metric, previousReport?.timeline);
  const unit = report.unit === "hour" ? "hour" : "day";
  const clicks = report.dataNotes.eventsInRange;
  const prevClicks = previousReport ? previousReport.dataNotes.eventsInRange : null;
  const notCounted = report.dataNotes.spamEnquiries + report.dataNotes.excludedEnquiries;
  const visitors = k.newVisitors.value + k.returningVisitors.value;

  return (
    <div className={cx("min-w-0 transition-opacity", analyticsLoading && "opacity-60")} aria-busy={analyticsLoading}>
      {/* Headline figures + timeline */}
      <Card padding="none" aria-labelledby="ov-trend">
        <h2 id="ov-trend" className="sr-only">
          Traffic over time
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4" role="group" aria-label="Metric shown in the chart">
          {HEADLINES.map((h, i) => (
            <MetricSwitch
              key={h.metric}
              label={h.label}
              short={h.short}
              icon={h.icon}
              hint={h.hint}
              value={kpiText(h.kpi(report))}
              delta={kpiDelta(h.kpi(report))}
              selected={h.metric === metric}
              onSelect={() => setMetric(h.metric)}
              className={cx(
                i % 2 === 1 && "border-l border-line",
                i >= 2 && "border-t border-line lg:border-t-0",
                i === 2 && "lg:border-l",
                i === 0 && "rounded-tl-[var(--radius-card)]",
                i === 1 && "rounded-tr-[var(--radius-card)] lg:rounded-tr-none",
                i === 3 && "lg:rounded-tr-[var(--radius-card)]",
              )}
            />
          ))}
        </div>
        <div className="border-t border-line p-4 sm:p-5">
          <div className="mb-3 flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0 text-[0.875rem] font-medium text-fg">
              {headline.series} per {unit}
            </p>
            <p className="text-[0.75rem] text-muted">Last {rangeLabel} vs the {rangeLabel} before</p>
          </div>
          <TimeSeriesChart
            ariaLabel={`${headline.series} per ${unit}, last ${rangeLabel}, with the previous period`}
            points={points}
            height={260}
            series={[
              { key: "current", label: headline.series, area: true },
              { key: "previous", label: "Previous period", dashed: true },
            ]}
          />
          {metric === "visitors" ? (
            <p className="mt-2 text-[0.75rem] text-muted">Each {unit} counts unique visitors in it, so the buckets do not add up to the total.</p>
          ) : null}
        </div>
      </Card>

      {/* Every other figure */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 [&_span.truncate]:whitespace-normal">
        <KpiTile
          label="Time per session"
          value={kpiText(k.avgEngagedMsPerSession)}
          delta={kpiDelta(k.avgEngagedMsPerSession)}
          hint={DEFINITIONS.avgEngagedTime}
          sub={totals ? `${formatDuration(totals.avgMsPerView)} per page view` : undefined}
        />
        <KpiTile label="Pages / session" value={kpiText(k.avgPagesPerSession)} delta={kpiDelta(k.avgPagesPerSession)} hint={DEFINITIONS.pagesPerSession} />
        <KpiTile
          label="Engaged sessions"
          value={kpiText(k.engagedSessions)}
          delta={kpiDelta(k.engagedSessions)}
          hint={DEFINITIONS.engagedSession}
          sub={k.sessions.value ? `${formatPercent(k.engagedSessions.value / k.sessions.value)} of sessions` : undefined}
        />
        <KpiTile label="Bounce rate" value={kpiText(k.bounceRate)} delta={kpiDelta(k.bounceRate, false)} hint={DEFINITIONS.bounceRate} />
        <KpiTile
          label="Conversion rate"
          value={kpiText(k.conversionRate)}
          delta={kpiDelta(k.conversionRate)}
          hint={DEFINITIONS.conversionRate}
          sub={notCounted ? `${formatNumber(notCounted)} spam or excluded not counted` : "Sessions that sent an enquiry"}
        />
        <KpiTile
          label="Tracked clicks"
          value={formatNumber(clicks)}
          delta={numberDelta(clicks, prevClicks)}
          hint="Every tracked event in the range: button and link clicks, plays, navigation, mailto/tel and contact-form steps."
          href={routes.analytics("behaviour")}
        />
        <KpiTile
          label="New visitors"
          value={kpiText(k.newVisitors)}
          delta={kpiDelta(k.newVisitors)}
          hint={DEFINITIONS.newVisitor}
          sub={visitors ? `${formatPercent(k.newVisitors.value / visitors)} of visitors` : undefined}
        />
        <KpiTile
          label="Returning visitors"
          value={kpiText(k.returningVisitors)}
          delta={kpiDelta(k.returningVisitors)}
          hint={DEFINITIONS.returningVisitor}
          sub={visitors ? `${formatPercent(k.returningVisitors.value / visitors)} of visitors` : undefined}
        />
        <KpiTile
          label="Median load time"
          value={k.medianLoadMs.measured ? `${(k.medianLoadMs.value / 1000).toFixed(2)}s` : "-"}
          delta={kpiDelta(k.medianLoadMs, false)}
          hint={DEFINITIONS.loadTime}
          href={routes.analytics("speed")}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Quick links into the other tabs */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Top channels"
            icon="link"
            hint={DEFINITIONS.channel}
            description="Sessions by where they came from"
            actions={
              <LinkButton href={routes.analytics("acquisition")} size="sm" variant="ghost" iconRight="arrowRight">
                All
              </LinkButton>
            }
          />
          <BarList
            ariaLabel="Sessions by channel"
            labelHeader="Channel"
            valueHeader="Sessions"
            limit={5}
            rows={report.channels.map((c) => ({
              key: c.channel,
              label: c.channel,
              value: c.sessions,
              share: c.share,
              icon: <ChannelDot channel={c.channel} />,
              sub: c.enquiries ? `${formatNumber(c.enquiries)} enq.` : undefined,
            }))}
          />
        </Card>
        <Card>
          <CardHeader
            title="Top pages"
            icon="file"
            hint={DEFINITIONS.pageview}
            description={
              totals ? (
                <span>
                  {formatNumber(totals.paths)} pages viewed
                  {totals.avgScroll !== null ? ` · ${Math.round(totals.avgScroll)}% avg. scroll` : ""}
                </span>
              ) : undefined
            }
            actions={
              <LinkButton href={routes.analytics("pages")} size="sm" variant="ghost" iconRight="arrowRight">
                All
              </LinkButton>
            }
          />
          <BarList
            ariaLabel="Page views by page"
            labelHeader="Page"
            valueHeader="Views"
            limit={5}
            rows={report.pages.map((p) => ({
              key: p.path,
              label: <span className="font-mono text-[0.75rem]">{p.path}</span>,
              value: p.views,
              share: report.kpis.pageviews.value ? p.views / report.kpis.pageviews.value : undefined,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

/** A headline figure that is also a toggle for the chart below (aria-pressed). */
function MetricSwitch({
  label,
  short,
  icon,
  hint,
  value,
  delta,
  selected,
  onSelect,
  className,
}: {
  label: string;
  /** Label on phones (2 tiles per row). */
  short: string;
  icon: AdminIconName;
  hint: string;
  value: string;
  delta: Delta | null;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <div className={cx("relative min-w-0 p-4 transition-colors sm:p-5", selected ? "bg-fg/[0.035]" : "hover:bg-fg/[0.02]", className)}>
      <span aria-hidden="true" className={cx("absolute inset-x-4 top-0 h-[2px] rounded-full sm:inset-x-5", selected ? "bg-accent" : "bg-transparent")} />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={cx(eyebrow, "flex min-w-0 items-center gap-1.5", selected && "text-fg")}>
          <AdminIcon name={icon} size={14} className={cx("hidden shrink-0 sm:block", selected && "text-accent")} />
          <span className="truncate sm:hidden">{short}</span>
          <span className="hidden truncate sm:inline">{label}</span>
        </span>
        <span className="relative z-10">
          <InfoTip text={hint} label={`About ${label}`} />
        </span>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-[clamp(1.375rem,1.15rem+0.7vw,1.875rem)] font-medium leading-none tracking-[-0.03em] text-fg tabular-nums">{value}</span>
        {delta ? <DeltaText delta={delta} /> : <span className="font-mono text-[0.75rem] text-muted">-</span>}
      </div>
      <p className="mt-1.5 truncate text-[0.75rem] text-muted">{selected ? "Shown in the chart" : "vs previous period"}</p>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Show ${label} in the chart`}
        onClick={onSelect}
        className="absolute inset-0 rounded-[inherit] focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="min-w-0" aria-busy="true" aria-label="Loading analytics">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-[220px] w-full" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 [&_span.truncate]:whitespace-normal">
        {Array.from({ length: 9 }, (_, i) => (
          <KpiTile key={i} label="" value="" loading className={i === 8 ? "col-span-2 md:col-span-1" : undefined} />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}
