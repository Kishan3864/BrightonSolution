"use client";

import { BarList, Sparkline, StackedBar, TimeSeriesChart } from "../../charts";
import { Card, CardHeader, KpiTile, Skeleton, TONE_DOT, numberDelta } from "../../kit";
import { CONTACT_STATUSES, CONTACT_STATUS_META, timeAgo, timeOf } from "../../data/records";
import { routes } from "../../shell/router";
import type { ContactStatus } from "@/lib/firebase/schema";
import { formatPercent } from "@/lib/analytics/report";
import {
  FACET_LABEL,
  breakdown,
  humanDuration,
  periodMeta,
  type ContactInsights as Insights,
  type ContactPeriod,
  type Facet,
} from "./contactStats";

/**
 * Header figures and charts of the Contacts view: six KPI tiles (status tiles filter the list), the
 * submissions-per-day chart with the previous period dashed, the status pipeline with the contact
 * waiting longest, and ranked service / budget / source lists whose rows filter the list.
 */

const fmtAvg = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1).replace(/\.0$/, ""));

export default function ContactInsights({
  part,
  insights,
  loading,
  now,
  period,
  status,
  onStatus,
  facet,
  onFacet,
}: {
  /** kpis: the six tiles; charts: submissions chart, status pipeline and breakdowns. */
  part: "kpis" | "charts";
  insights: Insights;
  loading: boolean;
  now: number;
  period: ContactPeriod;
  status: ContactStatus | "all";
  onStatus: (status: ContactStatus | "all") => void;
  facet: { kind: Facet; value: string } | null;
  onFacet: (facet: { kind: Facet; value: string } | null) => void;
}) {
  const meta = periodMeta(period);
  const { status: counts } = insights;
  const periodName = meta.days ? `last ${meta.days} days` : "everything loaded";
  const sparkValues = insights.points.map((p) => p.values.current ?? 0);
  const toggleStatus = (s: ContactStatus) => onStatus(status === s ? "all" : s);

  if (part === "kpis") {
    return (
      <div className="@container min-w-0">
        <div className="grid min-w-0 grid-cols-2 gap-3 @2xl:grid-cols-3 @6xl:grid-cols-6">
          <KpiTile
            label="Total"
            icon="inbox"
            value={insights.total.toLocaleString()}
            sub="All submissions loaded"
            hint="Every contact-form submission loaded in the admin (newest 1,000), spam included."
            loading={loading}
            onClick={() => onStatus("all")}
          />
          <KpiTile
            label="New"
            icon="mail"
            value={counts.new.toLocaleString()}
            accent={counts.new > 0}
            sub={insights.oldestNew ? `Oldest ${timeAgo(insights.oldestNew.createdAt, now)}` : "Nothing waiting"}
            hint={CONTACT_STATUS_META.new.description}
            loading={loading}
            onClick={() => toggleStatus("new")}
          />
          <KpiTile
            label="Handled"
            icon="check"
            value={counts.handled.toLocaleString()}
            sub={insights.handledRate === null ? "-" : `${formatPercent(insights.handledRate)} of real enquiries`}
            hint={CONTACT_STATUS_META.handled.description}
            loading={loading}
            onClick={() => toggleStatus("handled")}
          />
          <KpiTile
            label="Spam"
            icon="shield"
            value={counts.spam.toLocaleString()}
            sub={insights.total ? `${formatPercent(counts.spam / insights.total)} of all` : "-"}
            hint={CONTACT_STATUS_META.spam.description}
            loading={loading}
            onClick={() => toggleStatus("spam")}
          />
          <KpiTile
            label={meta.days ? `Last ${meta.days} days` : "All time"}
            icon="calendar"
            value={insights.inPeriod.toLocaleString()}
            delta={insights.previous === null ? null : numberDelta(insights.inPeriod, insights.previous)}
            deltaSuffix={`vs previous ${meta.days ?? ""} days`}
            sub={insights.previous === null ? `Real enquiries, ${periodName}` : undefined}
            hint={`Submissions that are not spam, ${periodName}. Compared with the ${meta.days ?? ""} days before.`}
            loading={loading}
            sparkline={sparkValues.length > 1 ? <Sparkline values={sparkValues} height={28} ariaLabel={`Submissions per ${insights.unit}`} /> : null}
          />
          <KpiTile
            label="Per week"
            icon="activity"
            value={fmtAvg(insights.perWeek)}
            sub={`Over ${fmtAvg(insights.weeks)} ${insights.weeks === 1 ? "week" : "weeks"}`}
            hint={`Real enquiries per week, averaged over the ${periodName}.`}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Submissions"
            icon="chart"
            description={`Real enquiries per ${insights.unit}, ${periodName}${insights.prevSince !== null ? ", previous period dashed" : ""}.`}
          />
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <TimeSeriesChart
              height={220}
              ariaLabel={`Contact-form submissions per ${insights.unit}, ${periodName}`}
              points={insights.points}
              series={
                insights.prevSince !== null
                  ? [
                      { key: "current", label: "Submissions", area: true },
                      { key: "previous", label: "Previous period", dashed: true },
                    ]
                  : [{ key: "current", label: "Submissions", area: true }]
              }
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Status" icon="layers" description="All loaded submissions. Tap a status to filter the list." />
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <StackedBar
              ariaLabel="Submissions by status"
              selected={status === "all" ? null : status}
              onSelect={(key) => toggleStatus(key as ContactStatus)}
              segments={CONTACT_STATUSES.map((s) => ({
                key: s,
                label: CONTACT_STATUS_META[s].label,
                value: counts[s],
                color: TONE_DOT[CONTACT_STATUS_META[s].tone],
              }))}
            />
          )}
          <div className="mt-4 border-t border-line pt-4">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">Waiting longest</p>
            {insights.oldestNew ? (
              <a
                href={routes.contacts(insights.oldestNew.id)}
                className="group mt-1.5 flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-sharp border border-accent/35 bg-accent/[0.06] px-3 py-2 transition-colors hover:border-accent/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] font-medium text-fg">{insights.oldestNew.name || "(no name)"}</span>
                  <span className="block truncate text-[0.75rem] text-muted">
                    {insights.oldestNew.service || insights.oldestNew.company || insights.oldestNew.email}
                  </span>
                </span>
                <span className="shrink-0 text-right font-mono text-[0.75rem] tabular-nums text-accent">
                  {humanDuration(now - timeOf(insights.oldestNew))}
                </span>
              </a>
            ) : (
              <p className="mt-1.5 text-[0.8125rem] text-muted">Every enquiry has been answered.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(["service", "budget", "source"] as const).map((kind) => (
          <Card key={kind} className={kind === "source" ? "md:col-span-2 xl:col-span-1" : undefined}>
            <CardHeader
              title={`By ${FACET_LABEL[kind].toLowerCase()}`}
              icon={kind === "service" ? "briefcase" : kind === "budget" ? "wallet" : "link"}
              description={`Real enquiries, ${periodName}. Tap to filter.`}
            />
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <BarList
                ariaLabel={`Submissions by ${FACET_LABEL[kind].toLowerCase()}`}
                limit={6}
                empty="No submissions in this period."
                rows={breakdown(insights.periodRows, kind).map((row) => {
                  const active = facet?.kind === kind && facet.value === row.key;
                  return {
                    key: row.key,
                    label: active ? `${row.key} (filtered)` : row.key,
                    value: row.value,
                    share: row.share,
                    color: active ? "rgba(237,148,59,0.32)" : undefined,
                    onClick: () => onFacet(active ? null : { kind, value: row.key }),
                  };
                })}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
