"use client";

import { useMemo, useState } from "react";
import { DEFINITIONS, formatDateTime, formatNumber, formatPercent, type ClickRow, type EventDoc } from "@/lib/analytics/report";
import { BarList, Funnel } from "../../charts";
import { useAdminData } from "../../data/AdminDataProvider";
import { timeAgo } from "../../data/records";
import {
  AdminIcon,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  FilterChips,
  KpiTile,
  SearchField,
  Tabs,
  numberDelta,
  type Column,
  EventPill,
  MiniStat,
} from "../../kit";
import { routes } from "../../shell/router";
import { eventMeta, eventText, eventsInRange } from "../../data/analytics";
import { TabFallback } from "./TabFallback";

/**
 * Analytics > Behaviour: what visitors do. KPI row (tracked events, CTA clicks, email/phone clicks,
 * form submissions, each vs the previous period), event totals, the contact-form funnel with its
 * error fields, a click explorer (most clicked overall as in the old dashboard, then CTA, outbound,
 * video, navigation and email/phone clicks) and the 50 most recent events with type filters.
 */

type ClickTab = "all" | "cta" | "outbound" | "play" | "nav" | "contact";

/** A click explorer row: every list is normalised to this shape. */
type ClickItem = { key: string; type: string; label: string; href: string; path: string; clicks: number; sessions: number; visitors: number };

const RECENT_LIMIT = 50;

function fromClickRows(rows: readonly ClickRow[], type: string | ((row: ClickRow) => string)): ClickItem[] {
  return rows.map((row) => {
    const t = typeof type === "string" ? type : type(row);
    return { key: `${t}:${row.label}:${row.href}`, type: t, label: row.label, href: row.href, path: row.path, clicks: row.clicks, sessions: row.sessions, visitors: row.visitors };
  });
}

/** The old dashboard's "most clicked": every in-range event grouped by type + label. */
function mostClicked(events: readonly EventDoc[]): ClickItem[] {
  const map = new Map<string, ClickItem & { s: Set<string>; v: Set<string>; pages: Map<string, number> }>();
  for (const event of events) {
    const type = event.type || "unknown";
    const label = event.label || event.href || "";
    const key = `${type}\u0000${label}`;
    let row = map.get(key);
    if (!row) {
      row = { key, type, label, href: event.href ?? "", path: "", clicks: 0, sessions: 0, visitors: 0, s: new Set(), v: new Set(), pages: new Map() };
      map.set(key, row);
    }
    row.clicks += 1;
    if (event.sessionId) row.s.add(event.sessionId);
    if (event.visitorId) row.v.add(event.visitorId);
    if (event.path) row.pages.set(event.path, (row.pages.get(event.path) ?? 0) + 1);
  }
  return [...map.values()]
    .map(({ s, v, pages, ...row }) => ({
      ...row,
      sessions: s.size,
      visitors: v.size,
      path: [...pages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
    }))
    .sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label));
}

/** Compact phone card for a click row: label, type and page on the left, clicks on the right. */
function ClickCard({ item, showType }: { item: ClickItem; showType: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-medium text-fg [overflow-wrap:anywhere]">{eventText(item)}</p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
          {showType ? <EventPill type={item.type} label={item.label} /> : null}
          {item.path ? <span className="min-w-0 truncate font-mono">{item.path}</span> : null}
          <span className="tabular-nums">
            · {formatNumber(item.sessions)} {item.sessions === 1 ? "session" : "sessions"}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[1.0625rem] font-medium tabular-nums text-fg">{formatNumber(item.clicks)}</p>
        <p className="text-[0.6875rem] text-muted">clicks</p>
      </div>
    </div>
  );
}

/** Compact phone card for a recent event. */
function RecentCard({ event, now, sessionLink }: { event: EventDoc; now: number; sessionLink: string | null }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 text-[0.875rem] font-medium text-fg [overflow-wrap:anywhere]">{eventText({ type: event.type ?? "", label: event.label, href: event.href })}</p>
        <time dateTime={event.createdAt?.toISOString()} className="shrink-0 pt-0.5 font-mono text-[0.6875rem] text-muted">
          {timeAgo(event.createdAt, now)}
        </time>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
        <EventPill type={event.type ?? ""} label={event.label} />
        {event.path ? <span className="min-w-0 truncate font-mono">{event.path}</span> : null}
        {sessionLink ? (
          <a href={sessionLink} className="ml-auto inline-flex min-h-11 items-center gap-0.5 font-medium text-accent hover:underline">
            Session
            <AdminIcon name="chevronRight" size={12} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function BehaviourTab() {
  const { report, previousReport, analytics, settings, now } = useAdminData();
  const [clickTab, setClickTab] = useState<ClickTab>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    if (!report || !analytics) return null;
    const events = eventsInRange(analytics.events, report.since, report.until, settings.excludedVisitors);
    const b = report.behaviour;
    const sessionIds = new Set(report.sessions.map((s) => s.id));
    const clicks: Record<ClickTab, ClickItem[]> = {
      all: mostClicked(events),
      cta: fromClickRows(b.ctaClicks, "cta_click"),
      outbound: fromClickRows(b.outboundClicks, "outbound"),
      play: fromClickRows(b.playClicks, "play"),
      nav: fromClickRows(b.navClicks, "nav"),
      contact: b.contactClicks.map((row) => ({ ...fromClickRows([row], row.type)[0] })),
    };
    const typeCounts = new Map<string, number>();
    for (const event of events) typeCounts.set(event.type || "unknown", (typeCounts.get(event.type || "unknown") ?? 0) + 1);
    return { events, clicks, sessionIds, typeCounts };
  }, [report, analytics, settings.excludedVisitors]);

  const recent = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.events
      .filter((event) => typeFilter === "all" || (event.type || "unknown") === typeFilter)
      .filter((event) => !q || [event.label, event.href, event.path, event.type].some((v) => (v ?? "").toLowerCase().includes(q)))
      .slice(0, RECENT_LIMIT);
  }, [data, typeFilter, query]);

  if (!report || !data) return <TabFallback cards={4} />;

  const b = report.behaviour;
  const pb = previousReport?.behaviour ?? null;
  const total = (list: typeof b.eventTotals) => list.reduce((sum, row) => sum + row.events, 0);
  const typeTotal = (list: typeof b.eventTotals, type: string) => list.find((row) => row.type === type)?.events ?? 0;
  const funnel = b.formFunnel;

  const clickTabs: { key: ClickTab; label: string; count: number }[] = [
    { key: "all", label: "Most clicked", count: data.clicks.all.length },
    { key: "cta", label: "CTA", count: data.clicks.cta.length },
    { key: "outbound", label: "Outbound", count: data.clicks.outbound.length },
    { key: "play", label: "Video", count: data.clicks.play.length },
    { key: "nav", label: "Navigation", count: data.clicks.nav.length },
    { key: "contact", label: "Email & phone", count: data.clicks.contact.length },
  ];

  const clickColumns: Column<ClickItem>[] = [
    {
      key: "label",
      header: "Label",
      mobile: "title",
      sortValue: (r) => r.label,
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block [overflow-wrap:anywhere]">{eventText(r)}</span>
          {r.href && r.href !== r.label ? <span className="block truncate font-mono text-[0.6875rem] text-muted">{r.href}</span> : null}
        </span>
      ),
    },
    { key: "type", header: "Type", mobile: "badge", width: "9rem", sortValue: (r) => eventMeta(r.type).label, cell: (r) => <EventPill type={r.type} label={r.label} /> },
    {
      key: "path",
      header: "Top page",
      mobile: "subtitle",
      hideBelow: "lg",
      sortValue: (r) => r.path,
      cell: (r) => <span className="font-mono text-[0.75rem] text-muted [overflow-wrap:anywhere]">{r.path || "-"}</span>,
    },
    { key: "clicks", header: "Clicks", align: "right", width: "6rem", sortValue: (r) => r.clicks, cell: (r) => formatNumber(r.clicks) },
    { key: "sessions", header: "Sessions", align: "right", width: "6rem", sortValue: (r) => r.sessions, cell: (r) => formatNumber(r.sessions) },
    { key: "visitors", header: "Visitors", align: "right", width: "6rem", hideBelow: "md", sortValue: (r) => r.visitors, cell: (r) => formatNumber(r.visitors) },
  ];
  // The "all" list mixes every type; the single-type lists do not need the type column.
  const columnsFor = clickTab === "all" || clickTab === "contact" ? clickColumns : clickColumns.filter((c) => c.key !== "type");

  const recentColumns: Column<EventDoc>[] = [
    {
      key: "time",
      header: "Time",
      mobile: "meta",
      width: "11rem",
      cell: (e) => (
        <time dateTime={e.createdAt?.toISOString()} title={formatDateTime(e.createdAt)} className="whitespace-nowrap font-mono text-[0.75rem] text-muted">
          <span className="@2xl:hidden">{timeAgo(e.createdAt, now)}</span>
          <span className="hidden @2xl:inline">{formatDateTime(e.createdAt)}</span>
        </time>
      ),
    },
    { key: "type", header: "Type", mobile: "badge", width: "9rem", cell: (e) => <EventPill type={e.type ?? ""} label={e.label} /> },
    { key: "label", header: "Label", mobile: "title", cell: (e) => <span className="[overflow-wrap:anywhere]">{eventText({ type: e.type ?? "", label: e.label, href: e.href })}</span> },
    {
      key: "page",
      header: "Page",
      mobile: "subtitle",
      cell: (e) => <span className="font-mono text-[0.75rem] text-muted [overflow-wrap:anywhere]">{e.path || "-"}</span>,
    },
    {
      key: "session",
      header: "Session",
      mobile: "meta",
      width: "7rem",
      cell: (e) =>
        e.sessionId && data.sessionIds.has(e.sessionId) ? (
          <a href={routes.session(e.sessionId)} aria-label="Open session" className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap text-[0.75rem] font-medium text-accent hover:underline pointer-coarse:min-h-11">
            Open
            <AdminIcon name="chevronRight" size={12} />
          </a>
        ) : (
          <span className="text-[0.75rem] text-muted">-</span>
        ),
    },
  ];

  const typeOptions = [
    { value: "all", label: "All", count: data.events.length },
    ...[...data.typeCounts.entries()].sort((a, c) => c[1] - a[1]).map(([type, count]) => ({ value: type, label: eventMeta(type).plural, count, tone: eventMeta(type).tone })),
  ];

  return (
    <div className="min-w-0">
      {/* ---------------------------------------------------------------- KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon="activity"
          label="Tracked events"
          value={formatNumber(total(b.eventTotals))}
          delta={pb ? numberDelta(total(b.eventTotals), total(pb.eventTotals)) : null}
          hint="Clicks on buttons, outbound links, videos, menus, email and phone links, plus contact-form steps. At most 60 per session are recorded."
        />
        <KpiTile
          icon="pointer"
          label="CTA clicks"
          value={formatNumber(typeTotal(b.eventTotals, "cta_click"))}
          delta={pb ? numberDelta(typeTotal(b.eventTotals, "cta_click"), typeTotal(pb.eventTotals, "cta_click")) : null}
          hint="Clicks on call-to-action buttons (Start a project, Book a call ...)."
        />
        <KpiTile
          icon="phone"
          label="Email & phone"
          value={formatNumber(b.mailtoClicks + b.telClicks)}
          delta={pb ? numberDelta(b.mailtoClicks + b.telClicks, pb.mailtoClicks + pb.telClicks) : null}
          sub={`${formatNumber(b.mailtoClicks)} email · ${formatNumber(b.telClicks)} phone`}
          hint="Clicks on email (mailto:) and phone (tel:) links. These people may contact you without the form."
        />
        <KpiTile
          icon="send"
          label="Forms sent"
          value={formatNumber(funnel.submissions)}
          delta={pb ? numberDelta(funnel.submissions, pb.formFunnel.submissions) : null}
          sub={funnel.contactPageSessions ? `${formatPercent(funnel.submissions / funnel.contactPageSessions, 1)} of contact-page sessions` : "No contact-page sessions"}
          hint={DEFINITIONS.formFunnel}
        />
      </div>

      {/* ---------------------------------------------------------------- totals + funnel */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Event totals" icon="bars" description="All tracked events in this range, by type" />
          <BarList
            ariaLabel="Event totals by type"
            labelHeader="Event"
            valueHeader="Events"
            limit={9}
            rows={b.eventTotals.map((row) => {
              const meta = eventMeta(row.type);
              return {
                key: row.type,
                label: meta.plural,
                value: row.events,
                share: total(b.eventTotals) ? row.events / total(b.eventTotals) : 0,
                sub: `${formatNumber(row.sessions)} sessions`,
                icon: <AdminIcon name={meta.icon} size={14} className="text-muted" />,
              };
            })}
            empty="No events in this range."
          />
        </Card>
        <Card>
          <CardHeader title="Contact form" icon="funnel" hint={DEFINITIONS.formFunnel} description="Sessions moving through the website contact form" />
          <Funnel
            ariaLabel="Contact form funnel"
            steps={[
              { key: "page", label: "Viewed the contact page", value: funnel.contactPageSessions, hint: "Sessions that opened /contact" },
              { key: "start", label: "Started the form", value: funnel.formStarts, hint: "Typed in or focused a field" },
              { key: "sent", label: "Sent successfully", value: funnel.submissions, hint: "Saved without an error" },
            ]}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
            <MiniStat label="Blocked" value={formatNumber(funnel.formErrors)} sub="validation" />
            <MiniStat label="Not saved" value={formatNumber(funnel.failedSubmissions)} sub="send failed" />
            <MiniStat label="Enquiries" value={formatNumber(funnel.enquiries)} sub="counted" />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">Fields that blocked a submit</p>
            <BarList
              ariaLabel="Form fields with validation errors"
              rows={funnel.errorFields.map((row) => ({ key: row.field, label: row.field, value: row.count, color: "rgba(255,138,122,0.16)" }))}
              empty="No validation errors in this range."
              limit={6}
            />
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- click explorer */}
      <Card padding="none" className="mt-3">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHeader
            title="Clicks"
            icon="pointer"
            description="What people clicked, with the page they clicked it on most"
            className="mb-2"
          />
          <Tabs ariaLabel="Click lists" items={clickTabs} value={clickTab} onChange={setClickTab} />
        </div>
        <div className="p-2 sm:p-3">
          <DataTable
            bare
            dense
            caption={`${clickTabs.find((t) => t.key === clickTab)?.label ?? "Clicks"} in this range`}
            rows={data.clicks[clickTab]}
            columns={columnsFor}
            rowKey={(r) => r.key}
            renderCard={(r) => <ClickCard item={r} showType={clickTab === "all" || clickTab === "contact"} />}
            initialSort={{ key: "clicks", dir: "desc" }}
            pageSize={15}
            resetKey={clickTab}
            empty={<EmptyState compact icon="pointer" title="No clicks of this kind" description="Nothing was recorded in this range." />}
          />
        </div>
      </Card>

      {/* ---------------------------------------------------------------- recent */}
      <Card padding="none" className="mt-3">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHeader
            title="Recent events"
            icon="clock"
            description={`The ${RECENT_LIMIT} newest events${typeFilter !== "all" || query ? " that match" : ""}, newest first`}
            className="mb-3"
          />
          <div className="flex min-w-0 flex-col gap-2.5">
            <SearchField value={query} onChange={setQuery} placeholder="Search label, link or page" label="Search events" />
            <FilterChips ariaLabel="Event type" options={typeOptions} value={typeFilter} onChange={setTypeFilter} className="sm:flex-wrap" />
          </div>
        </div>
        <div className="p-2 sm:p-3">
          <DataTable
            bare
            dense
            caption="Recent events"
            rows={recent}
            columns={recentColumns}
            rowKey={(e) => e.id}
            renderCard={(e) => <RecentCard event={e} now={now} sessionLink={e.sessionId && data.sessionIds.has(e.sessionId) ? routes.session(e.sessionId) : null} />}
            pageSize={20}
            resetKey={`${typeFilter}|${query}`}
            empty={<EmptyState compact icon="activity" title="No events" description={query || typeFilter !== "all" ? "Nothing matches these filters." : "No events in this range."} />}
          />
        </div>
      </Card>
    </div>
  );
}
