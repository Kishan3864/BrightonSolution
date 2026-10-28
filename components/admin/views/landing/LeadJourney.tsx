"use client";

import { useEffect, useState } from "react";
import { DEFINITIONS, formatDateTime, formatDuration, formatNumber, type Journey, type SessionDetail } from "@/lib/analytics/report";
import { AdminIcon, Button, InfoTip, LinkButton, Notice, Skeleton, Tag, cx, eyebrow, surface } from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { routes } from "../../shell/router";

/**
 * Visitor journey of a lead (when the lead carries the visitorId of the browser that sent it):
 * first touch, totals, device, and a vertical timeline of every session with its pages and clicks.
 * The session in which the lead was sent is marked. Journeys are cached for this visit, so going
 * back and forth between leads does not query Firestore again.
 */

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; journey: Journey };

const cache = new Map<string, Journey>();
const SESSIONS_SHOWN = 4;

export default function LeadJourney({ visitorId, leadTime }: { visitorId: string; leadTime: number }) {
  const { loadJourney } = useAdminData();
  const [state, setState] = useState<State>(() => {
    const cached = cache.get(visitorId);
    return cached ? { status: "ready", journey: cached } : { status: "loading" };
  });
  const [attempt, setAttempt] = useState(0);
  const [all, setAll] = useState(false);

  useEffect(() => {
    const cached = cache.get(visitorId);
    if (cached) {
      setState({ status: "ready", journey: cached });
      return;
    }
    let live = true;
    setState({ status: "loading" });
    void loadJourney(visitorId).then((result) => {
      if (!live) return;
      if (result.ok) {
        cache.set(visitorId, result.journey);
        setState({ status: "ready", journey: result.journey });
      } else setState({ status: "error", message: result.message });
    });
    return () => {
      live = false;
    };
  }, [visitorId, loadJourney, attempt]);

  if (state.status === "loading") {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading the visitor journey">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Notice tone="error" role="alert" title="Could not load the journey" action={<Button size="sm" icon="refresh" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>}>
        {state.message}
      </Notice>
    );
  }

  const j = state.journey;
  if (!j.found) {
    return (
      <p className="text-[0.8125rem] leading-relaxed text-muted">
        No page views are stored for this visitor. They may have blocked analytics, or the visits are older than the retention period.
      </p>
    );
  }

  // Newest first reads naturally in a feed; the lead's own session is highlighted.
  const sessions = [...j.sessions].reverse();
  const shown = all ? sessions : sessions.slice(0, SESSIONS_SHOWN);
  const leadSession = sessionOf(j.sessions, leadTime);
  const device = [j.device, j.browser, j.os].filter(Boolean).join(" · ");

  return (
    <div className="min-w-0 space-y-4">
      <dl className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
        {[
          { label: "Sessions", value: formatNumber(j.totals.sessions) },
          { label: "Page views", value: formatNumber(j.totals.pageviews) },
          { label: "Time on site", value: formatDuration(j.totals.engagedMs) },
          { label: "Clicks", value: formatNumber(j.totals.events) },
        ].map((item) => (
          <div key={item.label} className={cx(surface.well, "min-w-0 px-3 py-2")}>
            <dt className={cx(eyebrow, "text-[0.6875rem]")}>{item.label}</dt>
            <dd className="mt-0.5 font-mono text-[1rem] tabular-nums text-fg">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex min-w-0 flex-wrap gap-1.5">
        {j.firstSeen ? <Tag icon="calendar">First seen {formatDateTime(j.firstSeen)}</Tag> : null}
        {j.country ? <Tag icon="globe">{j.country.name}</Tag> : null}
        {device ? <Tag icon={j.device === "mobile" ? "smartphone" : j.device === "tablet" ? "tablet" : "monitor"}>{device}</Tag> : null}
        {j.screen ? <Tag icon="grid">{j.screen}</Tag> : null}
      </div>

      {j.firstTouch ? (
        <div className={cx(surface.well, "min-w-0 px-3 py-2.5 text-[0.8125rem]")}>
          <p className={cx(eyebrow, "flex items-center gap-1 text-[0.6875rem]")}>
            First touch <InfoTip text={DEFINITIONS.firstTouch} />
          </p>
          <p className="mt-1 text-fg [overflow-wrap:anywhere]">
            <span className="font-medium">{j.firstTouch.channel}</span>
            {j.firstTouch.source ? <span className="text-muted"> · {j.firstTouch.source}</span> : null}
          </p>
          <p className="mt-0.5 text-muted [overflow-wrap:anywhere]">
            Landed on <span className="font-mono text-fg">{j.firstTouch.landing || "/"}</span> · {formatDateTime(j.firstTouch.at)}
          </p>
          {!j.historyComplete ? <p className="mt-1 text-[0.75rem] text-muted">Earlier visits may be older than the retention period.</p> : null}
        </div>
      ) : null}

      <ol className="relative min-w-0 space-y-3 border-l border-line pl-4" aria-label="Sessions, newest first">
        {shown.map((s) => (
          <SessionItem key={s.id} session={s} isLead={leadSession === s.id} />
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {sessions.length > SESSIONS_SHOWN ? (
          <Button size="sm" variant="ghost" icon={all ? "chevronUp" : "chevronDown"} onClick={() => setAll((v) => !v)}>
            {all ? "Show fewer sessions" : `Show all ${sessions.length} sessions`}
          </Button>
        ) : null}
        <LinkButton size="sm" variant="ghost" href={routes.visitor(j.visitorId)} iconRight="arrowRight">
          Open in Analytics
        </LinkButton>
      </div>
    </div>
  );
}

/** Id of the session the lead was sent in: the last one that started before the lead. */
function sessionOf(sessions: readonly SessionDetail[], leadTime: number): string | null {
  if (!leadTime) return null;
  let hit: string | null = null;
  for (const s of sessions) if (s.start.getTime() <= leadTime + 60_000) hit = s.id;
  return hit;
}

function SessionItem({ session: s, isLead }: { session: SessionDetail; isLead: boolean }) {
  const [open, setOpen] = useState(isLead);
  const pages = s.pages;
  const source = [s.channel, s.source && s.source !== s.channel ? s.source : ""].filter(Boolean).join(" · ");
  return (
    <li className="relative min-w-0">
      <span
        aria-hidden="true"
        className={cx("absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full border-2 border-surface", isLead ? "bg-accent" : "bg-line-strong")}
      />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full min-w-0 items-start justify-between gap-3 rounded-sharp text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-accent md:min-h-0"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] font-medium text-fg">
            {formatDateTime(s.start)}
            {isLead ? (
              <span className="rounded-[0.4rem] bg-accent/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent">Lead sent</span>
            ) : null}
          </span>
          <span className="block text-[0.75rem] text-muted [overflow-wrap:anywhere]">
            {source || "Direct"} · {s.pageCount} {s.pageCount === 1 ? "page" : "pages"} · {formatDuration(s.engagedMs)}
            {s.device ? ` · ${s.device}` : ""}
          </span>
        </span>
        <AdminIcon name={open ? "chevronUp" : "chevronDown"} size={16} className="mt-0.5 shrink-0 text-muted" />
      </button>
      {open ? (
        <div className="mt-2 min-w-0 space-y-1">
          {pages.map((p) => (
            <div key={`${p.pageIndex}-${p.path}`} className="flex min-w-0 items-baseline justify-between gap-3 text-[0.75rem]">
              <span className="min-w-0 truncate font-mono text-fg" title={p.title || p.path}>
                {p.path}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-muted">
                {formatDuration(p.durationMs)}
                {p.scrollDepth !== null ? ` · ${p.scrollDepth}%` : ""}
              </span>
            </div>
          ))}
          {s.events.length ? (
            <div className="flex min-w-0 flex-wrap gap-1 pt-1">
              {s.events.slice(0, 12).map((e) => (
                <Tag key={e.id} icon="pointer">
                  {e.label || e.type}
                </Tag>
              ))}
              {s.events.length > 12 ? <Tag>+{s.events.length - 12} more</Tag> : null}
            </div>
          ) : null}
          {!s.landingInData ? <p className="text-[0.6875rem] text-muted">This session began before the stored data.</p> : null}
        </div>
      ) : null}
    </li>
  );
}
