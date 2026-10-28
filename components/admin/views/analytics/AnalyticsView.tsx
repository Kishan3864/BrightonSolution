"use client";

import { DEFINITIONS } from "@/lib/analytics/report";
import { Button, InfoTip, Notice, PageHeader, Tabs } from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { ANALYTICS_TAB_ITEMS } from "../../shell/nav";
import { routes, type AnalyticsTab } from "../../shell/router";
import AcquisitionTab from "./AcquisitionTab";
import AudienceTab from "./AudienceTab";
import BehaviourTab from "./BehaviourTab";
import OverviewTab from "./OverviewTab";
import PagesTab from "./PagesTab";
import SessionsTab from "./SessionsTab";
import SpeedTab from "./SpeedTab";

/**
 * Analytics: every website figure in one menu, as route-driven tabs (#/analytics/<tab>) that scroll
 * sideways on phones. The range switch lives in the TopBar (its own full-width row on phones); this
 * container shows the exact period, when it was loaded, load errors and the partial-data notice,
 * then renders the active tab. Every tab reads useAdminData().report (and previousReport).
 */
export default function AnalyticsView({
  tab,
  sessionId,
  visitorId,
}: {
  tab: AnalyticsTab;
  /** #/analytics/sessions/<id>: open that session's detail drawer. */
  sessionId: string | null;
  /** #/analytics/visitors/<id>: open that visitor's journey. */
  visitorId: string | null;
}) {
  const { analytics, analyticsError, analyticsLoading, truncated, rangeLabel, report, refresh } = useAdminData();
  const zone = report?.timeZone;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Analytics"
        description={
          <>
            <span className="sm:hidden">Last {rangeLabel} vs the period before.</span>
            <span className="hidden sm:inline">Visits, sources, pages, audience and behaviour over the last {rangeLabel}, compared with the {rangeLabel} before.</span>
          </>
        }
      >
        <Tabs ariaLabel="Analytics sections" items={ANALYTICS_TAB_ITEMS} value={tab} hrefFor={(key) => routes.analytics(key)} />
      </PageHeader>

      {analyticsError ? (
        <Notice
          tone="error"
          title="Could not load analytics"
          role="alert"
          className="mb-4"
          action={
            <Button size="sm" icon="refresh" onClick={() => void refresh()} loading={analyticsLoading}>
              Try again
            </Button>
          }
        >
          {analyticsError}
        </Notice>
      ) : null}
      {truncated.length ? (
        <Notice tone="warning" title="Partial data" className="mb-4">
          Only the newest records were loaded for: {truncated.join(", ")}. Choose a shorter range for complete figures.
        </Notice>
      ) : null}

      {analytics ? (
        <p className="-mt-1 mb-4 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] leading-relaxed text-muted tabular-nums sm:text-[0.75rem]">
          <span>
            {shortTime(analytics.since, zone)} – {shortTime(analytics.until, zone)}
          </span>
          <span aria-hidden="true">·</span>
          <span>loaded {shortTime(analytics.loadedAt, zone, true)}</span>
          {analyticsLoading ? (
            <span className="inline-flex items-center gap-1 text-accent" role="status">
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent" />
              updating
            </span>
          ) : null}
          <InfoTip text={DEFINITIONS.times} label="About times" />
        </p>
      ) : null}

      {tab === "overview" ? <OverviewTab /> : null}
      {tab === "acquisition" ? <AcquisitionTab /> : null}
      {tab === "pages" ? <PagesTab /> : null}
      {tab === "audience" ? <AudienceTab /> : null}
      {tab === "behaviour" ? <BehaviourTab /> : null}
      {tab === "sessions" ? <SessionsTab sessionId={sessionId} visitorId={visitorId} /> : null}
      {tab === "speed" ? <SpeedTab /> : null}
    </div>
  );
}

/** "20 Oct, 19:48" (or "19:48" for today when `timeOnlyToday`), in the report's zone. */
function shortTime(date: Date, timeZone?: string, timeOnlyToday = false): string {
  const zone = timeZone ? { timeZone } : {};
  try {
    const sameDay = new Date().toLocaleDateString("en-GB", zone) === date.toLocaleDateString("en-GB", zone);
    const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", ...zone });
    if (timeOnlyToday && sameDay) return time;
    return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short", ...zone })}, ${time}`;
  } catch {
    return date.toLocaleString();
  }
}
