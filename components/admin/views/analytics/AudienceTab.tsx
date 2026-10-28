"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DEFINITIONS, formatNumber, formatPercent, type BreakdownRow, type Report } from "@/lib/analytics/report";
import { BarChart, BarList, Donut, Heatmap, SERIES, type BarListRow } from "../../charts";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  AdminIcon,
  Card,
  CardHeader,
  KpiTile,
  Segmented,
  kpiDelta,
  CountryCode,
} from "../../kit";
import { deviceIcon } from "../../data/analytics";
import { TabFallback } from "./TabFallback";

/**
 * Analytics > Audience: who visits. KPI row (visitors, new, returning, countries), devices and
 * new-vs-returning donuts, countries, the weekday x hour heatmap with an hour-of-day bar chart, and
 * ranked breakdowns for browsers, operating systems, screens, languages and time zones (the old
 * dashboard's device/browser/OS/language/time-zone tables). One measure switch drives every list.
 */

type Measure = "sessions" | "visitors" | "enquiries";

const MEASURES: { value: Measure; label: string; title: string }[] = [
  { value: "sessions", label: "Sessions", title: "Rank by sessions" },
  { value: "visitors", label: "Visitors", title: "Rank by unique visitors" },
  { value: "enquiries", label: "Enquiries", title: "Rank by counted enquiries" },
];

/** Fixed colours per device so a device keeps its colour whatever the ranking. */
const DEVICE_COLOR: Record<string, string> = { mobile: SERIES[0], desktop: SERIES[1], tablet: SERIES[2] };
const VISIT_COLOR: Record<string, string> = { new: SERIES[0], returning: SERIES[1] };

function rowsFor(list: readonly BreakdownRow[], measure: Measure, icon?: (row: BreakdownRow) => ReactNode): BarListRow[] {
  const total = list.reduce((sum, row) => sum + row[measure], 0);
  return list
    .filter((row) => row[measure] > 0)
    .sort((a, b) => b[measure] - a[measure] || a.label.localeCompare(b.label))
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: row[measure],
      share: total ? row[measure] / total : 0,
      sub: measure === "enquiries" ? `${formatNumber(row.sessions)} sessions` : `${formatPercent(row.engagedRate)} engaged`,
      icon: icon?.(row),
    }));
}

function peakOf(report: Report): { day: string; hour: number; value: number } | null {
  let best: { day: string; hour: number; value: number } | null = null;
  report.heatmap.cells.forEach((row, d) =>
    row.forEach((value, hour) => {
      if (value > 0 && (!best || value > best.value)) best = { day: report.heatmap.days[d], hour, value };
    }),
  );
  return best;
}

const pad = (h: number) => String(h).padStart(2, "0");

export default function AudienceTab() {
  const { report } = useAdminData();
  const [measure, setMeasure] = useState<Measure>("sessions");

  const derived = useMemo(() => {
    if (!report) return null;
    const a = report.audience;
    const hours = Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: pad(h),
      longLabel: `${pad(h)}:00 - ${pad((h + 1) % 24)}:00`,
      value: report.heatmap.cells.reduce((sum, row) => sum + (row[h] ?? 0), 0),
    }));
    const busiestHour = hours.reduce((best, h) => (h.value > best.value ? h : best), hours[0]);
    const days = report.heatmap.days.map((day, d) => ({ day, value: report.heatmap.cells[d]?.reduce((s, v) => s + v, 0) ?? 0 }));
    const busiestDay = days.reduce((best, d) => (d.value > best.value ? d : best), days[0]);
    return {
      countries: a.countries.filter((c) => c.key !== "unknown").length,
      topCountry: a.countries.find((c) => c.key !== "unknown") ?? null,
      hours: hours.map((h) => ({ ...h, highlight: h.key === busiestHour.key && h.value > 0 })),
      busiestDay: busiestDay?.value ? busiestDay : null,
      peak: peakOf(report),
    };
  }, [report]);

  if (!report || !derived) return <TabFallback cards={6} />;
  const { kpis, audience: a } = report;
  const sessionsTotal = kpis.sessions.value;

  const lists: { key: string; title: string; icon: Parameters<typeof AdminIcon>[0]["name"]; rows: readonly BreakdownRow[]; header: string; hint?: string }[] = [
    { key: "browsers", title: "Browsers", icon: "globe", rows: a.browsers, header: "Browser" },
    { key: "os", title: "Operating systems", icon: "device", rows: a.os, header: "OS" },
    { key: "screens", title: "Screen sizes", icon: "monitor", rows: a.screens, header: "Screen (CSS px)" },
    { key: "languages", title: "Languages", icon: "message", rows: a.languages, header: "Language" },
    { key: "timezones", title: "Time zones", icon: "clock", rows: a.timeZones, header: "Time zone" },
  ];
  const valueHeader = MEASURES.find((m) => m.value === measure)?.label ?? "";

  return (
    <div className="min-w-0">
      {/* ---------------------------------------------------------------- KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon="users" label="Visitors" value={formatNumber(kpis.visitors.value)} delta={kpiDelta(kpis.visitors)} hint={DEFINITIONS.visitor} />
        <KpiTile
          icon="sparkles"
          label="New"
          value={formatNumber(kpis.newVisitors.value)}
          delta={kpiDelta(kpis.newVisitors)}
          hint={DEFINITIONS.newVisitor}
        />
        <KpiTile
          icon="refresh"
          label="Returning"
          value={formatNumber(kpis.returningVisitors.value)}
          delta={kpiDelta(kpis.returningVisitors)}
          hint={DEFINITIONS.returningVisitor}
        />
        <KpiTile
          icon="globe"
          label="Countries"
          value={formatNumber(derived.countries)}
          sub={derived.topCountry ? `Top: ${derived.topCountry.label} · ${formatPercent(derived.topCountry.share)}` : "No visits yet"}
          hint={DEFINITIONS.country}
        />
      </div>

      {/* ---------------------------------------------------------------- measure switch for every ranked list */}
      <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-[0.8125rem] text-muted">
          <span className="font-mono tabular-nums text-fg">{formatNumber(sessionsTotal)}</span> sessions in this range. Rank lists by
        </p>
        <Segmented ariaLabel="Rank lists by" size="sm" options={MEASURES} value={measure} onChange={setMeasure} />
      </div>

      {/* ---------------------------------------------------------------- devices / visits / countries */}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader title="Devices" icon="smartphone" description="Sessions by device type" />
          <Donut
            ariaLabel="Sessions by device"
            centerLabel="Sessions"
            legend="side"
            slices={a.devices.map((row) => ({ key: row.key, label: row.label, value: row.sessions, color: DEVICE_COLOR[row.key] ?? "#5c5f69" }))}
          />
          {sessionsTotal === 0 ? <p className="mt-2 text-center text-[0.8125rem] text-muted">No sessions in this range.</p> : null}
        </Card>
        <Card>
          <CardHeader title="New vs returning" icon="users" description="Sessions by visitor type" hint={DEFINITIONS.newVisitor} />
          <Donut
            ariaLabel="Sessions from new and returning visitors"
            centerLabel="Sessions"
            legend="side"
            slices={a.newVsReturning.map((row) => ({ key: row.key, label: row.label, value: row.sessions, color: VISIT_COLOR[row.key] }))}
          />
          {a.newVsReturning.length ? (
            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[0.75rem]">
              {a.newVsReturning.map((row) => (
                <div key={row.key} className="min-w-0">
                  <dt className="text-muted">{row.label}: engaged</dt>
                  <dd className="font-mono tabular-nums text-fg">{formatPercent(row.engagedRate)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Card>
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader title="Countries" icon="mapPin" hint={DEFINITIONS.country} description="Estimated from the device time zone" />
          <BarList
            ariaLabel="Countries"
            labelHeader="Country"
            valueHeader={valueHeader}
            limit={8}
            rows={rowsFor(a.countries, measure, (row) => <CountryCode code={row.key} />)}
          />
        </Card>
      </div>

      {/* ---------------------------------------------------------------- when */}
      <Card className="mt-3">
        <CardHeader
          title="When people visit"
          icon="calendar"
          hint={DEFINITIONS.times}
          description={
            derived.peak
              ? `Busiest slot: ${derived.peak.day} ${pad(derived.peak.hour)}:00 (${formatNumber(derived.peak.value)} page views)${derived.busiestDay ? ` · busiest day: ${derived.busiestDay.day}` : ""}`
              : "Page views by weekday and hour, in your time zone"
          }
        />
        {report.heatmap.total ? (
          <>
            <Heatmap ariaLabel="Page views by weekday and hour" rows={report.heatmap.days} cells={report.heatmap.cells} max={report.heatmap.max} />
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">Page views by hour of day</p>
              <BarChart ariaLabel="Page views by hour of day" data={derived.hours} height={150} valueLabel="Page views" />
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-[0.8125rem] text-muted">No page views in this range.</p>
        )}
      </Card>

      {/* ---------------------------------------------------------------- tech + locale */}
      <div className="mt-7 mb-3 min-w-0">
        <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-fg">Technology and locale</h2>
        <p className="text-[0.8125rem] text-muted">Ranked by {valueHeader.toLowerCase()}; the bar shows the share of all {valueHeader.toLowerCase()}.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lists.map((list) => (
          <Card key={list.key}>
            <CardHeader title={list.title} icon={list.icon} />
            <BarList
              ariaLabel={list.title}
              labelHeader={list.header}
              valueHeader={valueHeader}
              rows={rowsFor(list.rows, measure)}
            />
          </Card>
        ))}
        <Card>
          <CardHeader title="Device detail" icon="layers" description="Engagement and conversion by device" />
          <ul className="divide-y divide-line">
            {a.devices.length === 0 ? <li className="py-6 text-center text-[0.8125rem] text-muted">No data in this range.</li> : null}
            {a.devices.map((row) => (
              <li key={row.key} className="flex min-w-0 items-center gap-3 py-2.5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.5rem] bg-fg/[0.06] text-muted">
                  <AdminIcon name={deviceIcon(row.key)} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium text-fg">{row.label}</p>
                  <p className="truncate text-[0.75rem] text-muted">
                    {formatNumber(row.sessions)} sessions · {formatNumber(row.visitors)} visitors
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-right">
                  <div>
                    <p className="font-mono text-[0.75rem] tabular-nums text-fg">{formatPercent(row.engagedRate)}</p>
                    <p className="text-[0.6875rem] text-muted">engaged</p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.75rem] tabular-nums text-fg">{formatPercent(row.conversionRate, 1)}</p>
                    <p className="text-[0.6875rem] text-muted">converted</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
