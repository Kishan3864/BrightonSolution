"use client";

import { useMemo, useState } from "react";
import { DEFINITIONS, formatDateTime, formatDuration, formatNumber, formatPercent, type SessionDetail, type VisitorRow } from "@/lib/analytics/report";
import { CHANNELS } from "@/lib/analytics/channels";
import { useAdminData } from "../../data/AdminDataProvider";
import { timeAgo } from "../../data/records";
import {
  AdminIcon,
  DataTable,
  EmptyState,
  FilterChips,
  KpiTile,
  SearchField,
  Segmented,
  Select,
  StatusPill,
  kpiDelta,
  type Column,
  ChannelPill,
  CountryCode,
} from "../../kit";
import { routes } from "../../shell/router";
import SessionDrawer, { sessionOutcome } from "./SessionsTabSessionDrawer";
import VisitorDrawer from "./SessionsTabVisitorDrawer";
import { deviceIcon, deviceLabel, shortId } from "../../data/analytics";
import { TabFallback } from "./TabFallback";

/**
 * Analytics > Sessions & visitors. A Sessions | Visitors switch over two searchable, filterable lists
 * (cards on phones, sortable tables on wider screens). A session row opens its detail drawer
 * (#/analytics/sessions/<id>: page path timeline, events, attribution, device); a visitor row opens
 * the visitor's whole journey (#/analytics/visitors/<id>, loaded with loadJourney()).
 */

type Mode = "sessions" | "visitors";
type SessionFilter = "all" | "engaged" | "bounced" | "enquiry" | "new";
type VisitorFilter = "all" | "new" | "returning" | "enquiry";

function sessionSearch(s: SessionDetail): string {
  return [s.id, s.visitorId, s.landing, s.landingTitle, s.exit, s.channel, s.source, s.referrer, s.utmCampaign, s.utmSource, s.browser, s.os, s.country?.name, s.timeZone, ...s.pages.map((p) => p.path)]
    .join(" ")
    .toLowerCase();
}

function visitorSearch(v: VisitorRow): string {
  return [v.id, v.firstChannel, v.firstSource, v.firstLanding, v.country?.name, v.browser, v.os, v.device].join(" ").toLowerCase();
}

function SessionCard({ s, now }: { s: SessionDetail; now: number }) {
  const outcome = sessionOutcome(s);
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 font-mono text-[0.875rem] font-medium text-fg [overflow-wrap:anywhere]">{s.landingInData ? s.landing : "(not set)"}</p>
        <StatusPill tone={outcome.tone} size="sm">
          {outcome.label}
        </StatusPill>
      </div>
      <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
        {s.channel}
        {s.source && s.source !== "(direct)" ? ` · ${s.source}` : ""}
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-muted">
        <span className="inline-flex items-center gap-1">
          <AdminIcon name="clock" size={12} />
          {timeAgo(s.start, now)}
        </span>
        <span className="font-mono tabular-nums">
          {s.pageCount} {s.pageCount === 1 ? "page" : "pages"} · {formatDuration(s.engagedMs)}
        </span>
        <span className="inline-flex items-center gap-1">
          <AdminIcon name={deviceIcon(s.device)} size={12} />
          {s.browser || deviceLabel(s.device)}
        </span>
        {s.country ? <CountryCode code={s.country.code} /> : null}
        {s.isNewVisitor ? <span className="text-accent">New</span> : null}
      </div>
    </div>
  );
}

function VisitorCard({ v, now }: { v: VisitorRow; now: number }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[0.875rem] font-medium text-fg">{shortId(v.id, 12)}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {v.enquiryIds.length ? (
            <StatusPill tone="green" size="sm">
              {v.enquiryIds.length} {v.enquiryIds.length === 1 ? "enquiry" : "enquiries"}
            </StatusPill>
          ) : null}
          <StatusPill tone={v.isNew ? "accent" : "muted"} size="sm" dot={false}>
            {v.isNew ? "New" : "Returning"}
          </StatusPill>
        </div>
      </div>
      <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
        First from {v.firstChannel}
        {v.firstSource && v.firstSource !== "(direct)" ? ` · ${v.firstSource}` : ""}
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-muted">
        <span className="inline-flex items-center gap-1">
          <AdminIcon name="clock" size={12} />
          {timeAgo(v.lastSeen, now)}
        </span>
        <span className="font-mono tabular-nums">
          {v.sessions} {v.sessions === 1 ? "visit" : "visits"} · {v.pageviews} pages · {formatDuration(v.engagedMs)}
        </span>
        <span className="inline-flex items-center gap-1">
          <AdminIcon name={deviceIcon(v.device)} size={12} />
          {v.browser || deviceLabel(v.device)}
        </span>
        {v.country ? <CountryCode code={v.country.code} /> : null}
      </div>
    </div>
  );
}

export default function SessionsTab({ sessionId, visitorId }: { sessionId: string | null; visitorId: string | null }) {
  const { report, now } = useAdminData();
  const [mode, setMode] = useState<Mode>(visitorId ? "visitors" : "sessions");
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [visitorFilter, setVisitorFilter] = useState<VisitorFilter>("all");
  const [channel, setChannel] = useState<string>("all");

  const sessionRows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.sessions.filter((s) => {
      if (channel !== "all" && s.channel !== channel) return false;
      if (sessionFilter === "engaged" && !s.engaged) return false;
      if (sessionFilter === "bounced" && s.engaged) return false;
      if (sessionFilter === "enquiry" && !(s.enquiryIds.length || s.submitted)) return false;
      if (sessionFilter === "new" && !s.isNewVisitor) return false;
      return !q || sessionSearch(s).includes(q);
    });
  }, [report, query, channel, sessionFilter]);

  const visitorRows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.visitors.filter((v) => {
      if (channel !== "all" && v.firstChannel !== channel) return false;
      if (visitorFilter === "new" && !v.isNew) return false;
      if (visitorFilter === "returning" && v.isNew) return false;
      if (visitorFilter === "enquiry" && !v.enquiryIds.length) return false;
      return !q || visitorSearch(v).includes(q);
    });
  }, [report, query, channel, visitorFilter]);

  const counts = useMemo(() => {
    const s = report?.sessions ?? [];
    const v = report?.visitors ?? [];
    return {
      engaged: s.filter((x) => x.engaged).length,
      enquiry: s.filter((x) => x.enquiryIds.length || x.submitted).length,
      newSessions: s.filter((x) => x.isNewVisitor).length,
      newVisitors: v.filter((x) => x.isNew).length,
      visitorEnquiries: v.filter((x) => x.enquiryIds.length).length,
      channels: CHANNELS.filter((c) => s.some((x) => x.channel === c)),
    };
  }, [report]);

  if (!report) return <TabFallback cards={2} />;
  const k = report.kpis;

  const sessionColumns: Column<SessionDetail>[] = [
    {
      key: "start",
      header: "Started",
      width: "10.5rem",
      sortValue: (s) => s.start.getTime(),
      cell: (s) => (
        <span className="block whitespace-nowrap">
          <span className="block text-fg">{timeAgo(s.start, now)}</span>
          <span className="block font-mono text-[0.6875rem] text-muted">{formatDateTime(s.start)}</span>
        </span>
      ),
    },
    {
      key: "landing",
      header: "Landing page",
      sortValue: (s) => s.landing,
      cell: (s) => (
        <span className="block min-w-0">
          <span className="block font-mono text-[0.75rem] [overflow-wrap:anywhere]">{s.landingInData ? s.landing : "(not set)"}</span>
          {s.pageCount > 1 ? <span className="block truncate text-[0.6875rem] text-muted">then {s.pages.slice(1, 4).map((p) => p.path).join(" → ")}{s.pages.length > 4 ? " …" : ""}</span> : null}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      sortValue: (s) => `${s.channel} ${s.source}`,
      cell: (s) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <ChannelPill channel={s.channel} />
          <span className="max-w-full truncate text-[0.75rem] text-muted">{s.source === "(direct)" ? "" : s.source}</span>
        </span>
      ),
    },
    { key: "pages", header: "Pages", align: "right", width: "5rem", sortValue: (s) => s.pageCount, cell: (s) => formatNumber(s.pageCount) },
    { key: "time", header: "Time", align: "right", width: "5.5rem", sortValue: (s) => s.engagedMs, cell: (s) => formatDuration(s.engagedMs) },
    {
      key: "device",
      header: "Device",
      hideBelow: "lg",
      width: "10rem",
      sortValue: (s) => `${s.device ?? ""} ${s.browser}`,
      cell: (s) => (
        <span className="flex min-w-0 items-center gap-1.5 text-[0.75rem]">
          <AdminIcon name={deviceIcon(s.device)} size={14} className="shrink-0 text-muted" />
          <span className="min-w-0 truncate">{[s.browser, s.os].filter(Boolean).join(" · ") || deviceLabel(s.device)}</span>
          {s.country ? <CountryCode code={s.country.code} /> : null}
        </span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      width: "7.5rem",
      sortValue: (s) => (s.enquiryIds.length ? 3 : s.submitted ? 2 : s.engaged ? 1 : 0),
      cell: (s) => {
        const o = sessionOutcome(s);
        return (
          <StatusPill tone={o.tone} size="sm">
            {o.label}
          </StatusPill>
        );
      },
    },
  ];

  const visitorColumns: Column<VisitorRow>[] = [
    {
      key: "id",
      header: "Visitor",
      width: "10rem",
      sortValue: (v) => v.id,
      cell: (v) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-[0.75rem]" title={v.id}>
            {shortId(v.id, 10)}
          </span>
          {v.isNew ? (
            <StatusPill tone="accent" size="sm" dot={false}>
              New
            </StatusPill>
          ) : null}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last seen",
      width: "9rem",
      sortValue: (v) => v.lastSeen.getTime(),
      cell: (v) => (
        <span className="block whitespace-nowrap">
          <span className="block text-fg">{timeAgo(v.lastSeen, now)}</span>
          <span className="block font-mono text-[0.6875rem] text-muted">
            since {v.firstSeen.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            {v.historyComplete ? "" : "*"}
          </span>
        </span>
      ),
    },
    {
      key: "first",
      header: "First source",
      sortValue: (v) => `${v.firstChannel} ${v.firstSource}`,
      cell: (v) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <ChannelPill channel={v.firstChannel} />
          <span className="max-w-full truncate text-[0.75rem] text-muted">{v.firstSource === "(direct)" ? "" : v.firstSource}</span>
        </span>
      ),
    },
    { key: "sessions", header: "Visits", align: "right", width: "5rem", sortValue: (v) => v.sessions, cell: (v) => formatNumber(v.sessions) },
    { key: "pages", header: "Pages", align: "right", width: "5rem", sortValue: (v) => v.pageviews, cell: (v) => formatNumber(v.pageviews) },
    { key: "time", header: "Time", align: "right", width: "5.5rem", hideBelow: "md", sortValue: (v) => v.engagedMs, cell: (v) => formatDuration(v.engagedMs) },
    {
      key: "device",
      header: "Device",
      hideBelow: "lg",
      width: "10rem",
      sortValue: (v) => `${v.device ?? ""} ${v.browser}`,
      cell: (v) => (
        <span className="flex min-w-0 items-center gap-1.5 text-[0.75rem]">
          <AdminIcon name={deviceIcon(v.device)} size={14} className="shrink-0 text-muted" />
          <span className="min-w-0 truncate">{[v.browser, v.os].filter(Boolean).join(" · ") || deviceLabel(v.device)}</span>
          {v.country ? <CountryCode code={v.country.code} /> : null}
        </span>
      ),
    },
    {
      key: "enquiries",
      header: "Enquiries",
      align: "right",
      width: "6.5rem",
      sortValue: (v) => v.enquiryIds.length,
      cell: (v) =>
        v.enquiryIds.length ? (
          <StatusPill tone="green" size="sm">
            {v.enquiryIds.length}
          </StatusPill>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
  ];

  const sessionChips = [
    { value: "all" as const, label: "All", count: report.sessions.length },
    { value: "engaged" as const, label: "Engaged", count: counts.engaged, tone: "blue" as const },
    { value: "bounced" as const, label: "Bounced", count: report.sessions.length - counts.engaged, tone: "muted" as const },
    { value: "enquiry" as const, label: "Enquiry", count: counts.enquiry, tone: "green" as const },
    { value: "new" as const, label: "New visitors", count: counts.newSessions, tone: "accent" as const },
  ];
  const visitorChips = [
    { value: "all" as const, label: "All", count: report.visitors.length },
    { value: "new" as const, label: "New", count: counts.newVisitors, tone: "accent" as const },
    { value: "returning" as const, label: "Returning", count: report.visitors.length - counts.newVisitors, tone: "muted" as const },
    { value: "enquiry" as const, label: "Sent an enquiry", count: counts.visitorEnquiries, tone: "green" as const },
  ];
  const channelOptions = [{ value: "all", label: "All channels" }, ...counts.channels.map((c) => ({ value: c, label: c }))];
  const filtered = mode === "sessions" ? sessionRows.length !== report.sessions.length : visitorRows.length !== report.visitors.length;
  const resetFilters = () => {
    setQuery("");
    setChannel("all");
    setSessionFilter("all");
    setVisitorFilter("all");
  };

  return (
    <div className="min-w-0">
      {/* ---------------------------------------------------------------- summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon="layers" label="Sessions" value={formatNumber(k.sessions.value)} delta={kpiDelta(k.sessions)} hint={DEFINITIONS.session} />
        <KpiTile
          icon="activity"
          label="Engaged"
          value={k.sessions.value ? formatPercent(1 - k.bounceRate.value) : "-"}
          sub={`bounce ${k.sessions.value ? formatPercent(k.bounceRate.value) : "-"} · ${formatNumber(k.engagedSessions.value)} engaged`}
          delta={kpiDelta(k.bounceRate, false)}
          hint={DEFINITIONS.engagedSession}
        />
        <KpiTile
          icon="file"
          label="Pages"
          value={k.avgPagesPerSession.measured ? formatNumber(k.avgPagesPerSession.value, 1) : "-"}
          delta={kpiDelta(k.avgPagesPerSession)}
          sub="per session, vs prev."
          hint={DEFINITIONS.pagesPerSession}
        />
        <KpiTile
          icon="clock"
          label="Time"
          value={k.avgEngagedMsPerSession.measured ? formatDuration(k.avgEngagedMsPerSession.value) : "-"}
          delta={kpiDelta(k.avgEngagedMsPerSession)}
          sub="on screen per session"
          hint={DEFINITIONS.avgEngagedTime}
        />
      </div>

      {/* ---------------------------------------------------------------- toolbar */}
      <div className="mt-5 flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <Segmented
            ariaLabel="Show sessions or visitors"
            block
            className="sm:w-auto sm:flex-none"
            options={[
              { value: "sessions", label: `Sessions · ${formatNumber(report.sessions.length)}` },
              { value: "visitors", label: `Visitors · ${formatNumber(report.visitors.length)}` },
            ]}
            value={mode}
            onChange={setMode}
          />
          <SearchField
            className="min-w-0 flex-1"
            value={query}
            onChange={setQuery}
            label={mode === "sessions" ? "Search sessions" : "Search visitors"}
            placeholder={mode === "sessions" ? "Search pages, sources, ids" : "Search ids, sources, countries"}
          />
          <Select label="Channel" value={channel} onChange={setChannel} options={channelOptions} className="sm:w-44" />
        </div>
        {mode === "sessions" ? (
          <FilterChips ariaLabel="Filter sessions" options={sessionChips} value={sessionFilter} onChange={setSessionFilter} />
        ) : (
          <FilterChips ariaLabel="Filter visitors" options={visitorChips} value={visitorFilter} onChange={setVisitorFilter} />
        )}
      </div>

      {/* ---------------------------------------------------------------- list */}
      <div className="mt-3 min-w-0">
        {mode === "sessions" ? (
          <DataTable
            caption="Sessions in the selected range, newest first"
            rows={sessionRows}
            columns={sessionColumns}
            rowKey={(s) => s.id}
            rowHref={(s) => routes.session(s.id)}
            rowLabel={(s) => `Open session from ${formatDateTime(s.start)}, landed on ${s.landing}`}
            selectedKey={sessionId}
            renderCard={(s) => <SessionCard s={s} now={now} />}
            pageSize={40}
            resetKey={`${query}|${channel}|${sessionFilter}`}
            breakpoint="lg"
            empty={
              <EmptyState
                compact
                icon="layers"
                title={filtered ? "No sessions match" : "No sessions in this range"}
                description={filtered ? "Try another search or filter." : "Pick a longer range in the top bar."}
              />
            }
          />
        ) : (
          <DataTable
            caption="Visitors with a session in the selected range, most recent first"
            rows={visitorRows}
            columns={visitorColumns}
            rowKey={(v) => v.id}
            rowHref={(v) => routes.visitor(v.id)}
            rowLabel={(v) => `Open visitor ${shortId(v.id, 10)}, last seen ${formatDateTime(v.lastSeen)}`}
            selectedKey={visitorId}
            renderCard={(v) => <VisitorCard v={v} now={now} />}
            pageSize={40}
            resetKey={`${query}|${channel}|${visitorFilter}`}
            breakpoint="lg"
            empty={
              <EmptyState
                compact
                icon="users"
                title={filtered ? "No visitors match" : "No visitors in this range"}
                description={filtered ? "Try another search or filter." : "Pick a longer range in the top bar."}
              />
            }
          />
        )}
        {filtered ? (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-[0.5rem] px-2 text-[0.8125rem] font-medium text-accent hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11"
          >
            <AdminIcon name="close" size={14} />
            Clear filters
          </button>
        ) : null}
        {mode === "visitors" ? (
          <p className="mt-3 text-[0.75rem] text-muted">
            * first visit is older than the loaded data. Visits, pages and time count this range only; open a visitor for the full history.
          </p>
        ) : null}
      </div>

      {/* Newer/older steps follow the filtered list when the open session is in it, else all sessions. */}
      <SessionDrawer
        sessionId={sessionId}
        orderedIds={(sessionRows.some((s) => s.id === sessionId) ? sessionRows : report.sessions).map((s) => s.id)}
      />
      <VisitorDrawer visitorId={visitorId} />
    </div>
  );
}
