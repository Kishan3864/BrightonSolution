"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CHANNELS, type Channel } from "@/lib/analytics/channels";
import {
  DEFINITIONS,
  formatDuration,
  formatNumber,
  formatPercent,
  type CampaignRow,
  type ChannelRow,
  type LandingPageRow,
  type SessionMetrics,
  type SourceRow,
} from "@/lib/analytics/report";
import { BarList, Donut } from "../../charts";
import {
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  FilterChips,
  SearchField,
  SkeletonCard,
  cx,
  type Column,
  ChannelDot,
  TableCard,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { matchesQuery } from "../../data/records";
import { channelColor, referrerRows, type ReferrerRow } from "../../data/analytics";

/**
 * Analytics > Acquisition: where sessions come from. Channels (donut + performance table), referring
 * sites (the old "Referrers" list), every source with a channel filter, UTM campaigns (the old
 * "Campaigns" list, now with term/content and outcomes) and landing pages. All rows carry the
 * shared SessionMetrics (engaged rate, bounce, enquiries, conversion) so sources can be compared
 * on quality, not only volume. Tables become stacked cards in narrow containers.
 */

const n = (v: number) => formatNumber(v);
const pct = (v: number) => formatPercent(v, v > 0 && v < 0.1 ? 1 : 0);
const sortN = (pick: (r: SessionMetrics) => number) => (r: SessionMetrics) => pick(r);

/** Columns every SessionMetrics table shares (after the first, identifying column). */
function metricColumns<T extends SessionMetrics>(withShare?: (row: T) => number): Column<T>[] {
  const cols: Column<T>[] = [
    { key: "sessions", header: "Sessions", align: "right", cell: (r) => n(r.sessions), sortValue: sortN((r) => r.sessions), mobile: "badge" },
  ];
  if (withShare) cols.push({ key: "share", header: "Share", align: "right", cell: (r) => pct(withShare(r)), sortValue: (r) => withShare(r), hideBelow: "lg" });
  cols.push(
    { key: "visitors", header: "Visitors", align: "right", cell: (r) => n(r.visitors), sortValue: sortN((r) => r.visitors), hideBelow: "lg" },
    { key: "engaged", header: "Engaged", align: "right", cell: (r) => pct(r.engagedRate), sortValue: sortN((r) => r.engagedRate), mobileLabel: "Engaged rate" },
    { key: "bounce", header: "Bounce", align: "right", cell: (r) => pct(r.bounceRate), sortValue: sortN((r) => r.bounceRate), hideBelow: "lg", mobile: "hidden" },
    {
      key: "pps",
      header: "Pages / s.",
      align: "right",
      cell: (r) => (r.sessions ? formatNumber(r.pageviews / r.sessions, 1) : "-"),
      sortValue: (r) => (r.sessions ? r.pageviews / r.sessions : 0),
      hideBelow: "xl",
      mobile: "hidden",
    },
    { key: "time", header: "Avg. time", align: "right", cell: (r) => formatDuration(r.avgEngagedMs), sortValue: sortN((r) => r.avgEngagedMs), hideBelow: "lg", mobileLabel: "Avg. time" },
    { key: "enquiries", header: "Enquiries", align: "right", cell: (r) => (r.enquiries ? <span className="text-accent">{n(r.enquiries)}</span> : "0"), sortValue: sortN((r) => r.enquiries) },
    { key: "conv", header: "Conv.", align: "right", cell: (r) => pct(r.conversionRate), sortValue: sortN((r) => r.conversionRate), mobileLabel: "Conversion" },
  );
  return cols;
}

function ChannelLabel({ channel }: { channel: Channel }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ChannelDot channel={channel} />
      <span className="min-w-0 text-fg">{channel}</span>
    </span>
  );
}

function PathLabel({ path, title }: { path: string; title: string }) {
  return (
    <span className="block min-w-0">
      <span className="block font-mono text-[0.75rem] font-normal text-fg [overflow-wrap:anywhere]">{path}</span>
      {title ? <span className="line-clamp-2 block text-[0.75rem] font-normal text-muted [overflow-wrap:anywhere]">{title}</span> : null}
    </span>
  );
}

function campaignTitle(r: CampaignRow) {
  return (
    <span className="block min-w-0">
      <span className="block text-fg [overflow-wrap:anywhere]">{r.utmCampaign || "(no campaign)"}</span>
      <span className="block font-mono text-[0.6875rem] font-normal text-muted [overflow-wrap:anywhere]">
        {r.utmSource || "-"} / {r.utmMedium || "-"}
        {r.utmTerm ? ` · term ${r.utmTerm}` : ""}
        {r.utmContent ? ` · content ${r.utmContent}` : ""}
      </span>
    </span>
  );
}

function campaignSub(r: CampaignRow) {
  return <ChannelLabel channel={r.channel} />;
}

/** One figure in a phone card: mono value + muted unit. */
function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className={cx("font-mono tabular-nums", accent ? "text-accent" : "text-fg")}>{value}</span> {label}
    </span>
  );
}

/**
 * Compact phone card for any SessionMetrics row: name, sessions + share, then one wrapping line of
 * quality figures (instead of a 4-row field grid per row).
 */
function metricsCard<T extends SessionMetrics>(title: (r: T) => ReactNode, share?: (r: T) => number, subtitle?: (r: T) => ReactNode) {
  return function MetricsCard(r: T) {
    return (
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-[0.9375rem] font-medium text-fg [overflow-wrap:anywhere]">{title(r)}</div>
          <div className="shrink-0 whitespace-nowrap text-right text-[0.75rem] text-muted">
            <span className="font-mono text-[0.9375rem] tabular-nums text-fg">{n(r.sessions)}</span> sessions
            {share ? <span className="font-mono tabular-nums"> · {pct(share(r))}</span> : null}
          </div>
        </div>
        {subtitle ? <div className="mt-0.5 min-w-0 text-[0.8125rem] text-muted">{subtitle(r)}</div> : null}
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-muted">
          <Stat value={pct(r.engagedRate)} label="engaged" />
          <Stat value={formatDuration(r.avgEngagedMs)} label="avg. time" />
          <Stat value={n(r.visitors)} label="visitors" />
          <Stat value={n(r.enquiries)} label={r.enquiries === 1 ? "enquiry" : "enquiries"} accent={r.enquiries > 0} />
          {r.enquiries ? <Stat value={pct(r.conversionRate)} label="conv." /> : null}
        </p>
      </div>
    );
  };
}

export default function AcquisitionTab() {
  const { report, analyticsLoading } = useAdminData();
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [query, setQuery] = useState("");

  const referrers = useMemo(() => (report ? referrerRows(report.sessions) : []), [report]);
  const totalSessions = report?.kpis.sessions.value ?? 0;

  const sources = useMemo(() => {
    if (!report) return [];
    return report.sources.filter((s) => (channel === "all" || s.channel === channel) && matchesQuery(query, [s.source, s.channel]));
  }, [report, channel, query]);

  if (!report) {
    return analyticsLoading ? (
      <div className="grid gap-3 lg:grid-cols-2" aria-busy="true">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={8} className="lg:col-span-2" />
      </div>
    ) : (
      <Card padding="none">
        <EmptyState icon="link" title="No acquisition data" description="Sessions and their sources appear once visits in this range are loaded." />
      </Card>
    );
  }

  const channelCounts = new Map<Channel, number>();
  for (const s of report.sources) channelCounts.set(s.channel, (channelCounts.get(s.channel) ?? 0) + 1);
  const chips = [
    { value: "all" as const, label: "All", count: report.sources.length },
    ...CHANNELS.filter((c) => channelCounts.has(c)).map((c) => ({ value: c, label: c, count: channelCounts.get(c) })),
  ];

  const channelCols: Column<ChannelRow>[] = [
    { key: "channel", header: "Channel", cell: (r) => <ChannelLabel channel={r.channel} />, sortValue: (r) => r.channel, mobile: "title" },
    ...metricColumns<ChannelRow>((r) => r.share),
  ];

  const sourceCols: Column<SourceRow>[] = [
    { key: "source", header: "Source", cell: (r) => <span className="[overflow-wrap:anywhere]">{r.source}</span>, sortValue: (r) => r.source, mobile: "title" },
    { key: "channel", header: "Channel", cell: (r) => <ChannelLabel channel={r.channel} />, sortValue: (r) => r.channel, mobile: "subtitle" },
    ...metricColumns<SourceRow>((r) => r.share),
  ];

  const campaignCols: Column<CampaignRow>[] = [
    {
      key: "campaign",
      header: "Campaign",
      cell: campaignTitle,
      sortValue: (r) => r.utmCampaign,
      mobile: "title",
    },
    { key: "channel", header: "Channel", cell: (r) => <ChannelLabel channel={r.channel} />, sortValue: (r) => r.channel, hideBelow: "md", mobile: "subtitle" },
    ...metricColumns<CampaignRow>(totalSessions ? (r) => r.sessions / totalSessions : undefined),
  ];

  const landingCols: Column<LandingPageRow>[] = [
    {
      key: "path",
      header: "Landing page",
      cell: (r) => <PathLabel path={r.path} title={r.title} />,
      sortValue: (r) => r.path,
      mobile: "title",
    },
    ...metricColumns<LandingPageRow>((r) => r.share),
  ];

  const sliceSessions = report.channels.reduce((sum, c) => sum + c.sessions, 0);

  return (
    <div className={cx("min-w-0 space-y-3 transition-opacity", analyticsLoading && "opacity-60")} aria-busy={analyticsLoading}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card>
          <CardHeader title="Channels" icon="layers" hint={DEFINITIONS.channel} description="Share of sessions by channel" />
          {report.channels.length ? (
            <Donut
              ariaLabel="Sessions by channel"
              centerLabel="Sessions"
              centerValue={n(sliceSessions)}
              maxSlices={8}
              legend="side"
              slices={report.channels.map((c) => ({ key: c.channel, label: c.channel, value: c.sessions, color: channelColor(c.channel) }))}
            />
          ) : (
            <EmptyState compact icon="layers" title="No sessions in this range" />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Referrers"
            icon="external"
            hint="The site a session's first page was opened from. (direct) = no referring site; (not set) = the session began before the loaded data."
            description="Sessions by referring site"
          />
          <BarList
            ariaLabel="Sessions by referring site"
            labelHeader="Site"
            valueHeader="Sessions"
            limit={8}
            rows={referrers.map((r: ReferrerRow) => ({
              key: r.host,
              label: <span className={r.host.startsWith("(") ? "text-muted" : undefined}>{r.host}</span>,
              value: r.sessions,
              share: r.share,
              icon: <ChannelDot channel={r.channel} />,
              sub: r.submitted ? `${n(r.submitted)} enq.` : undefined,
            }))}
          />
        </Card>
      </div>

      <TableCard title="Channel performance" icon="activity" hint={DEFINITIONS.engagedSession} description="Volume and quality of each channel">
        <DataTable
          bare
          caption="Sessions and outcomes by channel"
          rows={report.channels}
          rowKey={(r) => r.channel}
          columns={channelCols}
          renderCard={metricsCard<ChannelRow>((r) => <ChannelLabel channel={r.channel} />, (r) => r.share)}
          initialSort={{ key: "sessions", dir: "desc" }}
          empty={<EmptyState compact icon="layers" title="No sessions in this range" />}
        />
      </TableCard>

      <TableCard
        title="Sources"
        icon="globe"
        hint={DEFINITIONS.source}
        description={`${n(report.sources.length)} sources`}
        toolbar={
          <div className="space-y-3">
            <SearchField value={query} onChange={setQuery} placeholder="Search sources" label="Search sources" className="sm:max-w-xs" />
            <FilterChips ariaLabel="Filter by channel" options={chips} value={channel} onChange={(v) => setChannel(v as Channel | "all")} />
          </div>
        }
      >
        <DataTable
          bare
          caption="Sessions and outcomes by source"
          rows={sources}
          rowKey={(r) => `${r.channel}|${r.source}`}
          columns={sourceCols}
          renderCard={metricsCard<SourceRow>((r) => r.source, (r) => r.share, (r) => <ChannelLabel channel={r.channel} />)}
          initialSort={{ key: "sessions", dir: "desc" }}
          pageSize={25}
          resetKey={`${channel}|${query}`}
          empty={<EmptyState compact icon="search" title="No matching sources" description="Try another channel or search." />}
        />
      </TableCard>

      <TableCard title="Campaigns (UTM)" icon="target" hint="Sessions that landed with UTM tags (utm_source / utm_medium / utm_campaign, plus term and content)." description="Tagged links and their outcomes">
        <DataTable
          bare
          caption="Sessions by UTM campaign"
          rows={report.campaigns}
          rowKey={(r) => [r.utmSource, r.utmMedium, r.utmCampaign, r.utmTerm, r.utmContent].join("|")}
          columns={campaignCols}
          renderCard={metricsCard<CampaignRow>(campaignTitle, totalSessions ? (r) => r.sessions / totalSessions : undefined, campaignSub)}
          initialSort={{ key: "sessions", dir: "desc" }}
          pageSize={25}
          empty={<EmptyState compact icon="target" title="No UTM-tagged visits in this range" description="Add utm_source, utm_medium and utm_campaign to links you share to see them here." />}
        />
      </TableCard>

      <TableCard title="Landing pages" icon="file" hint={`${DEFINITIONS.landingPage} ${DEFINITIONS.partialSession}`} description="Where sessions start">
        <DataTable
          bare
          caption="Sessions by landing page"
          rows={report.landingPages}
          rowKey={(r) => r.path}
          columns={landingCols}
          renderCard={metricsCard<LandingPageRow>((r) => <PathLabel path={r.path} title={r.title} />, (r) => r.share)}
          initialSort={{ key: "sessions", dir: "desc" }}
          pageSize={25}
          empty={<EmptyState compact icon="file" title="No landing pages in this range" />}
        />
      </TableCard>
    </div>
  );
}
