"use client";

import { useMemo, useState } from "react";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/analytics/report";
import type { LeadStatus } from "@/lib/firebase/schema";
import { LAUNCH_PATH, site } from "@/lib/site";
import { BarList, Donut, Sparkline, StackedBar, TimeSeriesChart, SERIES, type BarListRow } from "../../charts";
import {
  AdminIcon,
  Button,
  Card,
  CardHeader,
  CopyButton,
  DataTable,
  EmptyState,
  FilterChips,
  KpiTile,
  Notice,
  PageHeader,
  SearchField,
  Section,
  Segmented,
  Select,
  StatusPill,
  TONE_DOT,
  cx,
  eyebrow,
  focusRing,
  kpiDelta,
  numberDelta,
  surface,
  type Column,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  LEAD_STATUSES,
  LEAD_STATUS_META,
  PLAN_NAMES,
  PLAN_UNSURE,
  byNewest,
  initials,
  leadKindLabel,
  leadSearchValues,
  leadSource,
  leadStatusOf,
  leadTelHref,
  leadWhatsappHref,
  leadMailHref,
  matchesQuery,
  planOf,
  priceOf,
  timeAgo,
  timeOf,
} from "../../data/records";
import type { LeadDoc } from "../../data/types";
import { RangePicker } from "../../shell/TopBar";
import { goBack, routes } from "../../shell/router";
import LeadDetail from "./LeadDetail";
import { LeadStatusSelect } from "./LeadStatusControls";
import { breakdown, isSpam, leadPoints, leadStats, money, planCounts, sourceLabel, splitList, windowOf } from "./leadStats";

/**
 * Landing page: leads from the private /start-project page only (collection "leads", full briefs
 * and plan requests). Top to bottom: "new since your last visit" banner, KPIs for the selected range
 * (leads, waiting for a reply, landing conversion, win rate), leads over time against the previous
 * period, the status pipeline with its value per currency, what leads ask for (plan interest tiles
 * that filter the list, type, project types, budget, timeline, stage, features, sources, campaigns,
 * contact preference), then the filterable list (table on wide screens, cards with quick WhatsApp /
 * call buttons on phones) and the detail panel at #/landing/<id>.
 */

type StatusFilter = "all" | LeadStatus;
type KindFilter = "all" | "brief" | "plan";
type Scope = "range" | "all";

const PAGE_URL = `${site.url.replace(/^https?:\/\//, "")}${LAUNCH_PATH}`;

function scrollToList() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("landing-leads")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export default function LandingView({ selectedId }: { selectedId: string | null }) {
  const {
    leads,
    inboxLoaded,
    inboxLoading,
    inboxError,
    range,
    rangeLabel,
    landingPage,
    previousReport,
    analyticsLoading,
    lastSeen,
    counts,
    markSeen,
    busyIds,
    now,
    setLeadStatus,
    exportLeads,
    refresh,
  } = useAdminData();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [plan, setPlan] = useState<string>("all");
  const [freshOnly, setFreshOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("range");

  const sorted = useMemo(() => [...leads].sort(byNewest), [leads]);
  const win = useMemo(() => windowOf(range, now), [range, now]);
  const stats = useMemo(() => leadStats(sorted, win, now), [sorted, win, now]);
  const points = useMemo(() => leadPoints(sorted, range, now), [sorted, range, now]);
  const isFresh = (lead: LeadDoc) => lastSeen.leads > 0 && timeOf(lead) > lastSeen.leads;

  // Breakdowns: non-spam leads of the range, or all of them.
  const scoped = useMemo(
    () => sorted.filter((l) => !isSpam(l) && (scope === "all" || (timeOf(l) >= win.since && timeOf(l) <= win.until))),
    [sorted, scope, win],
  );

  const visible = useMemo(
    () =>
      sorted.filter((lead) => {
        if (status !== "all" && leadStatusOf(lead) !== status) return false;
        if (kind !== "all" && lead.kind !== kind) return false;
        if (plan !== "all" && planOf(lead) !== plan) return false;
        if (freshOnly && !(lastSeen.leads > 0 && timeOf(lead) > lastSeen.leads)) return false;
        return matchesQuery(query, leadSearchValues(lead));
      }),
    [sorted, status, kind, plan, freshOnly, query, lastSeen.leads],
  );
  const order = useMemo(() => visible.map((l) => l.id), [visible]);
  const filtered = status !== "all" || kind !== "all" || plan !== "all" || freshOnly || query.trim() !== "";
  const clearFilters = () => {
    setStatus("all");
    setKind("all");
    setPlan("all");
    setFreshOnly(false);
    setQuery("");
  };

  // Landing conversion: non-spam leads in the range / unique visitors of the landing page.
  const visitors = landingPage?.visitors ?? 0;
  const conversion = visitors > 0 ? stats.inRange / visitors : null;
  const prevLanding = previousReport?.pages.find((row) => row.path === LAUNCH_PATH) ?? null;
  const prevConversion = prevLanding && prevLanding.visitors > 0 ? stats.previous / prevLanding.visitors : null;
  const conversionDelta =
    conversion !== null && prevConversion !== null ? kpiDelta({ change: conversion - prevConversion, kind: "rate" }) : null;

  const oldestNew = useMemo(() => {
    const waiting = sorted.filter((l) => leadStatusOf(l) === "new");
    return waiting.length ? waiting[waiting.length - 1] : null;
  }, [sorted]);

  const loadingFirst = !inboxLoaded && inboxLoading;
  const sinceVisit = counts.leadsSinceLastVisit;

  const filterTo = (next: Partial<{ status: StatusFilter; plan: string; fresh: boolean }>) => {
    if (next.status !== undefined) setStatus(next.status);
    if (next.plan !== undefined) setPlan(next.plan);
    if (next.fresh !== undefined) setFreshOnly(next.fresh);
    window.setTimeout(scrollToList, 30);
  };

  /* ------------------------------------------------------------- table */

  const columns: Column<LeadDoc>[] = [
    {
      key: "received",
      header: "Received",
      width: "9.5rem",
      sortValue: timeOf,
      cell: (l) => (
        <div className="min-w-0">
          <span className="block whitespace-nowrap font-mono text-[0.75rem] tabular-nums text-fg">{formatDateTime(l.createdAt)}</span>
          <span className="block text-[0.75rem] text-muted">{timeAgo(l.createdAt, now)}</span>
          {isFresh(l) ? <FreshTag className="mt-1" /> : null}
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortValue: (l) => l.name ?? "",
      cell: (l) => (
        <div className="min-w-0">
          <span className="block font-medium text-fg [overflow-wrap:anywhere]">{l.name || "(no name)"}</span>
          {l.company ? <span className="block text-muted [overflow-wrap:anywhere]">{l.company}</span> : null}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      hideBelow: "lg",
      cell: (l) => {
        const mail = leadMailHref(l);
        return (
          <div className="min-w-0 max-w-[15rem]">
            {mail ? (
              <a href={mail} className="block text-accent underline-offset-4 [overflow-wrap:anywhere] hover:underline">
                {l.email}
              </a>
            ) : (
              <span className="block text-muted [overflow-wrap:anywhere]">{l.email}</span>
            )}
            {l.phone ? <span className="block whitespace-nowrap text-fg">{l.phone}</span> : null}
            {l.contactPref ? <span className="block text-[0.75rem] text-muted">Prefers {l.contactPref}</span> : null}
          </div>
        );
      },
    },
    {
      key: "interest",
      header: "Interest",
      sortValue: (l) => (typeof l.price === "number" ? l.price : null),
      cell: (l) => (
        <div className="min-w-0">
          <span className="block font-medium text-fg">{l.plan ? planOf(l) : leadKindLabel(l)}</span>
          {priceOf(l) ? <span className="block font-mono text-[0.75rem] tabular-nums text-accent">{priceOf(l)}</span> : null}
          <span className="block text-[0.75rem] text-muted">{l.plan ? leadKindLabel(l) : l.budget || "No plan picked"}</span>
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      hideBelow: "lg",
      cell: (l) => (
        <div className="min-w-0 max-w-[16rem]">
          <span className="block text-fg">{l.projectTypes || "-"}</span>
          {l.stage ? <span className="block text-[0.75rem] text-muted">{l.stage}</span> : null}
        </div>
      ),
    },
    {
      key: "budget",
      header: "Budget, timeline",
      hideBelow: "xl",
      cell: (l) => (
        <div className="min-w-0">
          <span className="block whitespace-nowrap text-fg">{l.budget || "-"}</span>
          {l.timeline ? <span className="block text-[0.75rem] text-muted">{l.timeline}</span> : null}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      hideBelow: "xl",
      sortValue: leadSource,
      cell: (l) => <span className="block max-w-[11rem] text-muted [overflow-wrap:anywhere]">{leadSource(l)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (l) => LEAD_STATUSES.indexOf(leadStatusOf(l)),
      cell: (l) => (
        <LeadStatusSelect
          value={leadStatusOf(l)}
          disabled={busyIds.has(l.id)}
          label={`Status of ${l.name || "this lead"}`}
          onChange={(s) => void setLeadStatus(l.id, s)}
        />
      ),
    },
  ];

  /* ------------------------------------------------------------ render */

  return (
    <div className="min-w-0">
      <PageHeader
        title="Landing page"
        description={
          <>
            Briefs and plan requests from the private <code className="font-mono text-fg">{LAUNCH_PATH}</code> page. Figures follow the
            selected range; the list holds every lead.
          </>
        }
        actions={
          <>
            <RangePicker />
            <Button icon="download" onClick={() => exportLeads(visible)} disabled={!visible.length}>
              <span className="sm:hidden">CSV</span>
              <span className="hidden sm:inline">{filtered ? `Export ${formatNumber(visible.length)}` : "Export CSV"}</span>
            </Button>
          </>
        }
      />

      {inboxError ? (
        <Notice
          tone="error"
          role="alert"
          title="Could not load leads"
          className="mb-3"
          action={
            <Button size="sm" icon="refresh" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        >
          {inboxError}
        </Notice>
      ) : null}

      {sinceVisit > 0 ? (
        <div className={cx(surface.card, "mb-3 flex flex-col gap-3 border-accent/45 bg-accent/[0.06] p-4 sm:flex-row sm:items-center")}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-canvas">
              <AdminIcon name="sparkles" size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-fg">
                {sinceVisit} new {sinceVisit === 1 ? "lead" : "leads"} since your last visit
              </p>
              <p className="text-[0.8125rem] text-muted">Marked with an orange tag in the list.</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="primary" icon="filter" onClick={() => filterTo({ fresh: true })}>
              Show them
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon="check"
              onClick={() => {
                markSeen();
                setFreshOnly(false);
              }}
            >
              Mark as seen
            </Button>
          </div>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Leads"
          icon="rocket"
          loading={loadingFirst}
          value={formatNumber(stats.inRange)}
          delta={numberDelta(stats.inRange, stats.previous)}
          sub={`Last ${rangeLabel} · prev. ${formatNumber(stats.previous)}`}
          hint="Leads from the landing page in the selected range, spam excluded. The change compares the period of equal length before it."
          sparkline={<Sparkline values={points.map((p) => p.values.current ?? 0)} ariaLabel="Leads per bucket in the range" />}
        />
        <KpiTile
          label="To reply"
          icon="inbox"
          loading={loadingFirst}
          accent={stats.byStatus.new > 0}
          value={formatNumber(stats.byStatus.new)}
          sub={oldestNew ? `Oldest ${timeAgo(oldestNew.createdAt, now)}` : "All answered"}
          hint="Leads with status New, whatever their date. Tap to list them."
          onClick={() => filterTo({ status: "new" })}
        />
        <KpiTile
          label="Conversion"
          icon="target"
          loading={loadingFirst || (analyticsLoading && !landingPage)}
          value={conversion !== null ? formatPercent(conversion, 1) : "-"}
          delta={conversionDelta}
          sub={
            landingPage
              ? `${formatNumber(stats.inRange)} leads / ${formatNumber(visitors)} visitors`
              : `No visits to ${LAUNCH_PATH} in range`
          }
          hint={`Leads in the range divided by unique visitors of ${LAUNCH_PATH} in the range (from the page-view analytics).`}
        />
        <KpiTile
          label="Win rate"
          icon="trendUp"
          loading={loadingFirst}
          value={stats.winRate !== null ? formatPercent(stats.winRate) : "-"}
          sub={`${formatNumber(stats.byStatus.won)} won · ${formatNumber(stats.byStatus.lost)} lost`}
          hint="Won leads out of the leads that were decided (won + lost), over every lead loaded."
        />
      </div>

      {/* Trend + pipeline */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Leads over time"
            icon="chart"
            description={`${range === "24h" ? "Per hour" : "Per day"}, last ${rangeLabel}, against the previous period`}
          />
          <TimeSeriesChart
            ariaLabel={`Landing page leads per ${range === "24h" ? "hour" : "day"}`}
            points={points}
            height={220}
            format={(v) => formatNumber(v)}
            series={[
              { key: "current", label: "Leads", area: true },
              { key: "previous", label: "Previous period", dashed: true },
            ]}
          />
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
            <MiniStat label="Page views" value={landingPage ? formatNumber(landingPage.views) : "-"} />
            <MiniStat label="Visitors" value={landingPage ? formatNumber(landingPage.visitors) : "-"} />
            <MiniStat label="Last 7 days" value={`${formatNumber(stats.week)} leads`} />
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Pipeline"
            icon="layers"
            description={`All ${formatNumber(stats.total)} leads by status. Tap a status to list it.`}
          />
          <StackedBar
            ariaLabel="Leads by status"
            height={14}
            selected={status === "all" ? null : status}
            onSelect={(key) => filterTo({ status: status === key ? "all" : (key as LeadStatus) })}
            segments={LEAD_STATUSES.map((s) => ({
              key: s,
              label: LEAD_STATUS_META[s].label,
              value: stats.byStatus[s],
              color: TONE_DOT[LEAD_STATUS_META[s].tone],
            }))}
          />
          <div className="mt-5 border-t border-line pt-4">
            <p className={eyebrow}>Pipeline value</p>
            {stats.value.length ? (
              <ul className="mt-2 space-y-2.5">
                {stats.value.map((v) => (
                  <li key={v.currency} className="grid min-w-0 grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[1.0625rem] tabular-nums text-fg">{money(v.open, v.currency)}</p>
                      <p className="text-[0.75rem] text-muted">
                        Open · {v.openCount} {v.openCount === 1 ? "lead" : "leads"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[1.0625rem] tabular-nums text-[#8fe2b1]">{money(v.won, v.currency)}</p>
                      <p className="text-[0.75rem] text-muted">
                        Won · {v.wonCount} {v.wonCount === 1 ? "lead" : "leads"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[0.8125rem] text-muted">No priced plan requests yet.</p>
            )}
            <p className="mt-3 text-[0.75rem] leading-snug text-muted">
              Plan prices as shown to the visitor. Open = New + Contacted. Briefs without a plan price are not counted.
            </p>
          </div>
        </Card>
      </div>

      {/* What leads ask for */}
      <Section
        className="mt-7"
        title="What leads ask for"
        description={scope === "range" ? `${formatNumber(scoped.length)} leads in the last ${rangeLabel}, spam excluded` : `All ${formatNumber(scoped.length)} leads, spam excluded`}
        actions={
          <Segmented<Scope>
            ariaLabel="Breakdown period"
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: "range", label: rangeLabel },
              { value: "all", label: "All time" },
            ]}
          />
        }
      >
        <Card className="mb-3">
          <CardHeader title="Plan interest" icon="wallet" description="Tap a plan to filter the list." />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {planCounts(scoped, PLAN_NAMES).map((p) => {
              const active = plan === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => filterTo({ plan: active ? "all" : p.name })}
                  className={cx(
                    "relative min-h-[4.5rem] min-w-0 overflow-hidden rounded-sharp border px-3 py-2.5 text-left transition-colors",
                    focusRing,
                    active ? "border-accent bg-accent/[0.08]" : "border-line bg-canvas/40 hover:border-line-strong",
                  )}
                >
                  <span className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="truncate text-[0.875rem] font-medium text-fg">{p.name}</span>
                    <span className="font-mono text-[1.125rem] tabular-nums text-fg">{formatNumber(p.count)}</span>
                  </span>
                  <span className="mt-0.5 block text-[0.75rem] text-muted">
                    {p.name === PLAN_UNSURE ? "No plan picked" : "Plan interest"} · {formatPercent(p.share)}
                  </span>
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-fg/[0.05]">
                    <span className="block h-full bg-accent" style={{ width: `${Math.round(p.share * 100)}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {scoped.length === 0 ? (
          <Card padding="none">
            <EmptyState
              compact
              icon="chart"
              title={`No leads in the last ${rangeLabel}`}
              description="Switch to All time or pick a longer range to see the breakdowns."
              action={
                <Button size="sm" onClick={() => setScope("all")}>
                  Show all time
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader title="Type of lead" icon="layers" description="Full brief or plan request" />
              <Donut
                ariaLabel="Leads by type"
                legend="side"
                size={132}
                centerLabel="leads"
                slices={[
                  { key: "brief", label: "Full brief", value: scoped.filter((l) => l.kind !== "plan").length, color: SERIES[0] },
                  { key: "plan", label: "Plan request", value: scoped.filter((l) => l.kind === "plan").length, color: SERIES[1] },
                ]}
              />
            </Card>
            <BreakdownCard title="Project types" icon="briefcase" rows={breakdown(scoped, (l) => splitList(l.projectTypes))} note="A brief can name several." />
            <BreakdownCard title="Budget" icon="wallet" rows={breakdown(scoped, (l) => l.budget, "Not given")} />
            <BreakdownCard title="Timeline" icon="clock" rows={breakdown(scoped, (l) => l.timeline, "Not given")} />
            <BreakdownCard title="Stage" icon="target" rows={breakdown(scoped, (l) => l.stage, "Not given")} />
            <BreakdownCard title="Features" icon="sparkles" rows={breakdown(scoped, (l) => splitList(l.features))} note="Asked in full briefs; several per lead." />
            <BreakdownCard title="Sources" icon="link" rows={breakdown(scoped, sourceLabel)} note="UTM source, else the referring site." />
            <BreakdownCard title="Campaigns" icon="tag" rows={breakdown(scoped, (l) => l.utmCampaign, "(no campaign)")} note="utm_campaign of the shared link." />
            <BreakdownCard title="Contact preference" icon="message" rows={breakdown(scoped, (l) => l.contactPref, "Not given")} />
          </div>
        )}
      </Section>

      {/* The list */}
      <section id="landing-leads" aria-labelledby="landing-leads-title" className="mt-7 min-w-0 scroll-mt-20">
        <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 id="landing-leads-title" className="text-[1rem] font-semibold tracking-[-0.01em] text-fg">
              All leads
            </h2>
            <p className="text-[0.8125rem] text-muted" aria-live="polite">
              {filtered ? `${formatNumber(visible.length)} of ${formatNumber(sorted.length)} match` : `${formatNumber(sorted.length)} leads, newest first`}
            </p>
          </div>
          {filtered ? (
            <Button size="sm" variant="ghost" icon="close" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mb-3 space-y-2">
          <FilterChips<StatusFilter>
            ariaLabel="Filter leads by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: stats.total },
              ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_META[s].label, count: stats.byStatus[s], tone: LEAD_STATUS_META[s].tone })),
            ]}
          />
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search name, email, phone, note…"
              label="Search leads"
              className="col-span-2 sm:col-span-3 xl:col-span-1"
            />
            <Select<KindFilter>
              label="Type of lead"
              value={kind}
              onChange={setKind}
              options={[
                { value: "all", label: "All types" },
                { value: "brief", label: "Full brief" },
                { value: "plan", label: "Plan request" },
              ]}
            />
            <Select<string>
              label="Plan"
              value={plan}
              onChange={setPlan}
              options={[{ value: "all", label: "All plans" }, ...PLAN_NAMES.map((name) => ({ value: name, label: name }))]}
            />
            {lastSeen.leads > 0 ? (
              <button
                type="button"
                aria-pressed={freshOnly}
                onClick={() => setFreshOnly((v) => !v)}
                className={cx(
                  "col-span-2 inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sharp border px-3 text-[0.8125rem] transition-colors pointer-coarse:min-h-11 sm:col-span-1",
                  focusRing,
                  freshOnly ? "border-accent bg-accent/12 text-accent" : "border-line-strong bg-canvas/70 text-fg hover:border-fg/40",
                )}
              >
                <AdminIcon name="sparkles" size={15} />
                New since last visit
                <span className="font-mono text-[0.75rem] tabular-nums opacity-75">{sinceVisit}</span>
              </button>
            ) : null}
          </div>
        </div>

        <DataTable
          caption="Landing page leads, newest first"
          rows={visible}
          columns={columns}
          rowKey={(l) => l.id}
          rowHref={(l) => routes.landing(l.id)}
          rowLabel={(l) => `Open ${l.name || l.email || "lead"}, ${LEAD_STATUS_META[leadStatusOf(l)].label}`}
          selectedKey={selectedId}
          loading={loadingFirst}
          resetKey={`${status}|${kind}|${plan}|${freshOnly}|${query}`}
          rowClassName={(l) => (isFresh(l) ? "bg-accent/[0.045]" : undefined)}
          renderCard={(l) => <LeadCard lead={l} fresh={isFresh(l)} now={now} />}
          empty={
            sorted.length === 0 ? (
              <EmptyState
                icon="rocket"
                title="No leads yet"
                description={`Share ${PAGE_URL} and new leads will appear here, with an alert on this device.`}
                action={<CopyButton value={`${site.url}${LAUNCH_PATH}`} label="Copy page link" showLabel />}
              />
            ) : (
              <EmptyState
                icon="filter"
                title="No leads match"
                description="Try another status, plan or search."
                action={
                  <Button size="sm" icon="close" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            )
          }
        />
      </section>

      <LeadDetail leadId={selectedId} order={order} onClose={() => goBack(routes.landing())} />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function FreshTag({ className }: { className?: string }) {
  return (
    <span className={cx("inline-block w-fit whitespace-nowrap rounded-[0.4rem] bg-accent px-1.5 py-0.5 text-[0.6875rem] font-semibold text-canvas", className)}>
      New since last visit
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className={cx(eyebrow, "truncate text-[0.6875rem]")}>{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-[0.9375rem] tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function BreakdownCard({
  title,
  icon,
  rows,
  note,
}: {
  title: string;
  icon: Parameters<typeof CardHeader>[0]["icon"];
  rows: { key: string; label: string; value: number; share: number }[];
  note?: string;
}) {
  const list: BarListRow[] = rows.map((r) => ({ key: r.key, label: r.label, value: r.value, share: r.share }));
  return (
    <Card>
      <CardHeader title={title} icon={icon} description={note} />
      <BarList ariaLabel={`Leads by ${title.toLowerCase()}`} rows={list} limit={6} format={(v) => formatNumber(v)} empty="Nothing recorded" />
    </Card>
  );
}

/** Phone card: who, what, when, plus WhatsApp / call buttons that work without opening the lead. */
function LeadCard({ lead, fresh, now }: { lead: LeadDoc; fresh: boolean; now: number }) {
  const status = leadStatusOf(lead);
  const meta = LEAD_STATUS_META[status];
  const price = priceOf(lead);
  const wa = leadWhatsappHref(lead);
  const tel = leadTelHref(lead);
  const first = lead.name?.trim() || "(no name)";
  const action = cx(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-sharp border border-line-strong bg-surface-2 text-fg active:bg-fg/[0.08]",
    focusRing,
  );
  return (
    <div className="flex min-w-0 gap-3">
      <span
        aria-hidden="true"
        className={cx(
          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-[0.75rem] font-semibold",
          fresh ? "bg-accent text-canvas" : "bg-fg/[0.07] text-muted",
        )}
      >
        {initials(lead.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[0.9375rem] font-medium text-fg">{first}</p>
          <StatusPill tone={meta.tone} size="sm">
            {meta.label}
          </StatusPill>
        </div>
        {lead.company ? <p className="truncate text-[0.8125rem] text-muted">{lead.company}</p> : null}
        <p className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] text-fg">
          {lead.plan ? (
            <>
              <span className="font-medium">{lead.plan === PLAN_UNSURE ? "Help me choose" : `${lead.plan} plan`}</span>
              {price ? <span className="font-mono tabular-nums text-accent">{price}</span> : null}
              <span className="text-muted">· {leadKindLabel(lead)}</span>
            </>
          ) : (
            <>
              <span className="font-medium">{leadKindLabel(lead)}</span>
              {lead.budget ? <span className="text-muted">· {lead.budget}</span> : null}
            </>
          )}
        </p>
        {lead.projectTypes ? <p className="truncate text-[0.8125rem] text-muted">{lead.projectTypes}</p> : null}
        <div className="mt-2 flex min-w-0 items-end justify-between gap-2">
          <div className="min-w-0 text-[0.75rem] text-muted">
            {fresh ? <FreshTag className="mb-1" /> : null}
            <p className="truncate">
              {timeAgo(lead.createdAt, now)} · {leadSource(lead)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${first}`} className={action}>
                <AdminIcon name="whatsapp" size={18} />
              </a>
            ) : null}
            {tel ? (
              <a href={tel} aria-label={`Call ${first}`} className={action}>
                <AdminIcon name="phone" size={18} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
