"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFINITIONS,
  formatDateTime,
  formatDuration,
  type EnquiryDetail,
  type Journey,
  type SessionDetail,
} from "@/lib/analytics/report";
import { AdminIcon, InfoTip, KeyValue, Notice, Skeleton, Tag, cx, type AdminIconName } from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { referrerLabel } from "../../data/records";
import type { ContactDoc } from "../../data/types";
import { routes } from "../../shell/router";
import { humanDuration } from "./contactStats";

/**
 * Where a contact came from and what they did before writing: first-touch attribution
 * (EnquiryDetail from the report, or from the visitor's full history once loaded) and the visitor
 * journey (visitorJourney over every page view, click and enquiry of that browser) as a timeline of
 * visits, each with its pages, clicks and the enquiry itself.
 */

type JourneyState = { status: "loading" } | { status: "done"; journey: Journey } | { status: "error"; message: string };

const DEVICE_ICON: Record<string, AdminIconName> = { mobile: "smartphone", tablet: "tablet", desktop: "monitor" };

const EVENT_LABEL: Record<string, string> = {
  cta_click: "Clicked",
  outbound: "Opened link",
  play: "Played",
  mailto: "Email link",
  tel: "Phone link",
  nav: "Menu",
  form_start: "Started the form",
  form_error: "Form error",
  form_submit: "Sent the form",
};

function SubHeading({ children, hint, actions }: { children: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
        {children}
        {hint ? <InfoTip text={hint} /> : null}
      </h3>
      {actions}
    </div>
  );
}

/** Attribution facts of one enquiry. */
function Attribution({ enquiry, contact, inReport }: { enquiry: EnquiryDetail | null; contact: ContactDoc; inReport: (id: string) => boolean }) {
  const page = contact.page || "";
  const referrer = contact.referrer || "";
  if (!enquiry) {
    return (
      <KeyValue
        items={[
          { label: "Sent from page", value: page, mono: true },
          { label: "Referrer", value: referrer ? referrerLabel(referrer) : "" },
        ]}
      />
    );
  }
  const device = enquiry.device ? (
    <span className="inline-flex items-center gap-1.5">
      <AdminIcon name={DEVICE_ICON[enquiry.device] ?? "device"} size={14} className="text-muted" />
      <span className="capitalize">{enquiry.device}</span>
    </span>
  ) : (
    ""
  );
  const sessionLink =
    enquiry.sessionId && inReport(enquiry.sessionId) ? (
      <a href={routes.session(enquiry.sessionId)} className="text-accent underline-offset-4 hover:underline">
        Open the visit
      </a>
    ) : null;
  return (
    <div className="space-y-4">
      {enquiry.attribution === "none" ? (
        <Notice title="No tracking data">
          This browser had tracking off (or it was a team browser), so there is no visit history. The form still sent the page and referrer below.
        </Notice>
      ) : null}
      <KeyValue
        items={[
          {
            label: enquiry.attribution === "referrer" ? "Channel (from referrer)" : "First-touch channel",
            value: enquiry.channel ? <Tag icon="link">{enquiry.channel}</Tag> : "",
          },
          { label: "First-touch source", value: enquiry.source ?? "" },
          { label: "First landing page", value: enquiry.firstLanding ?? "", mono: true },
          {
            label: "First seen",
            value: enquiry.firstSeen ? `${formatDateTime(enquiry.firstSeen)}${enquiry.historyComplete ? "" : " (or earlier)"}` : "",
          },
          { label: "Visits before enquiry", value: enquiry.sessionsBeforeEnquiry === null ? "" : enquiry.sessionsBeforeEnquiry.toLocaleString() },
          { label: "Pages before enquiry", value: enquiry.pagesBeforeEnquiry === null ? "" : enquiry.pagesBeforeEnquiry.toLocaleString() },
          { label: "Time to enquiry", value: enquiry.timeToEnquiryMs === null ? "" : humanDuration(enquiry.timeToEnquiryMs) },
          {
            label: "Sent during visit from",
            value: enquiry.sessionChannel ? (
              <span>
                {enquiry.sessionChannel}
                {enquiry.sessionSource ? ` · ${enquiry.sessionSource}` : ""}
                {sessionLink ? <> · {sessionLink}</> : null}
              </span>
            ) : (
              ""
            ),
          },
          { label: "Visit landing page", value: enquiry.sessionLanding ?? "", mono: true },
          { label: "Sent from page", value: page, mono: true },
          { label: "Referrer", value: referrer ? referrerLabel(referrer) : "" },
          { label: "Device", value: device },
          { label: "Browser", value: [enquiry.browser, enquiry.browserVersion].filter(Boolean).join(" ") },
          { label: "Operating system", value: [enquiry.os, enquiry.osVersion].filter(Boolean).join(" ") },
          { label: "Country (estimated)", value: enquiry.country?.name ?? "" },
        ]}
      />
      <div className="flex flex-wrap gap-1.5">
        {enquiry.counted ? <Tag icon="check">Counted in analytics</Tag> : null}
        {enquiry.excluded ? <Tag icon="shield">Sent from an excluded browser</Tag> : null}
        {enquiry.status === "spam" ? <Tag icon="alert">Spam, not counted</Tag> : null}
        {enquiry.matchedBy ? <Tag icon="link">Matched to its visit by {enquiry.matchedBy === "event" ? "the form event" : "time"}</Tag> : null}
      </div>
    </div>
  );
}

type Step =
  | { kind: "page"; at: Date; key: string; path: string; title: string; durationMs: number; scroll: number | null }
  | { kind: "event"; at: Date; key: string; type: string; label: string }
  | { kind: "enquiry"; at: Date; key: string; current: boolean; name: string };

function stepsOf(session: SessionDetail, enquiries: readonly EnquiryDetail[], currentId: string): Step[] {
  const steps: Step[] = [
    ...session.pages.map(
      (p): Step => ({ kind: "page", at: p.at, key: `p${p.pageIndex}-${p.at.getTime()}`, path: p.path, title: p.title, durationMs: p.durationMs, scroll: p.scrollDepth }),
    ),
    // form_submit duplicates the enquiry marker; nav clicks are noise next to the page list.
    ...session.events
      .filter((e) => e.type !== "form_submit" && e.type !== "nav")
      .map((e): Step => ({ kind: "event", at: e.at, key: `e${e.id}`, type: e.type, label: e.label })),
    ...enquiries
      .filter((q) => q.sessionId === session.id && q.createdAt)
      .map((q): Step => ({ kind: "enquiry", at: q.createdAt as Date, key: `q${q.id}`, current: q.id === currentId, name: q.name })),
  ];
  return steps.sort((a, b) => a.at.getTime() - b.at.getTime());
}

const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function SessionItem({ session, index, enquiries, currentId, open, onToggle, last }: {
  session: SessionDetail;
  last: boolean;
  index: number;
  enquiries: readonly EnquiryDetail[];
  currentId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const steps = useMemo(() => stepsOf(session, enquiries, currentId), [session, enquiries, currentId]);
  const hasCurrent = steps.some((s) => s.kind === "enquiry" && s.current);
  const hasEnquiry = steps.some((s) => s.kind === "enquiry");
  return (
    <li className="relative min-w-0 pb-4 pl-7 last:pb-0">
      {last ? null : <span aria-hidden="true" className="absolute bottom-0 left-[9px] top-5 w-px bg-line" />}
      <span
        aria-hidden="true"
        className={cx(
          "absolute left-0 top-1 inline-flex size-[19px] items-center justify-center rounded-full border",
          hasCurrent ? "border-accent bg-accent text-canvas" : hasEnquiry ? "border-accent/60 bg-surface text-accent" : "border-line-strong bg-surface text-muted",
        )}
      >
        {hasEnquiry ? <AdminIcon name="mail" size={11} strokeWidth={2.5} /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="-mx-2 -my-1 flex w-[calc(100%+1rem)] min-w-0 items-start justify-between gap-3 rounded-sharp px-2 py-1 text-left transition-colors hover:bg-fg/[0.04] focus:outline-none focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11"
      >
        <span className="min-w-0">
          <span className="block text-[0.875rem] font-medium text-fg">
            Visit {index}
            <span className="font-normal text-muted"> · {formatDateTime(session.start)}</span>
          </span>
          <span className="mt-0.5 block text-[0.75rem] text-muted [overflow-wrap:anywhere]">
            {session.channel}
            {session.source && session.source !== "(direct)" ? ` · ${session.source}` : ""} · {session.pageCount} {session.pageCount === 1 ? "page" : "pages"} ·{" "}
            {formatDuration(session.engagedMs)} on screen
          </span>
        </span>
        <AdminIcon name={open ? "chevronUp" : "chevronDown"} size={16} className="mt-0.5 shrink-0 text-muted" />
      </button>
      {open ? (
        <ol className="mt-2 space-y-1 border-l border-line pl-3 text-[0.8125rem]">
          {steps.map((step) => (
            <li key={step.key} className="flex min-w-0 items-baseline gap-2">
              <span className="w-[4.25rem] shrink-0 whitespace-nowrap font-mono text-[0.6875rem] tabular-nums text-muted">{time(step.at)}</span>
              {step.kind === "page" ? (
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <span className="font-mono text-[0.75rem] text-fg">{step.path}</span>
                  <span className="text-muted">
                    {" "}
                    · {formatDuration(step.durationMs)}
                    {step.scroll !== null ? ` · ${Math.round(step.scroll)}% seen` : ""}
                  </span>
                </span>
              ) : step.kind === "event" ? (
                <span className="min-w-0 flex-1 text-muted [overflow-wrap:anywhere]">
                  <AdminIcon name={step.type === "form_error" ? "alert" : "pointer"} size={12} className="mr-1 inline align-[-1px]" />
                  {EVENT_LABEL[step.type] ?? step.type}
                  {step.label ? <span className="text-fg/85">: {step.label}</span> : null}
                </span>
              ) : (
                <span className={cx("min-w-0 flex-1 font-medium [overflow-wrap:anywhere]", step.current ? "text-accent" : "text-fg")}>
                  <AdminIcon name="send" size={12} className="mr-1 inline align-[-1px]" />
                  {step.current ? "Sent this enquiry" : `Sent another enquiry (${step.name || "no name"})`}
                </span>
              )}
            </li>
          ))}
          {steps.length === 0 ? <li className="text-muted">No pages recorded for this visit.</li> : null}
        </ol>
      ) : null}
    </li>
  );
}

const VISIBLE_SESSIONS = 6;

function Timeline({ journey, currentId }: { journey: Journey; currentId: string }) {
  const { sessions, enquiries } = journey;
  // Open the visit the enquiry was sent from (else the latest one).
  const sentFrom = enquiries.find((q) => q.id === currentId)?.sessionId ?? null;
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set([sentFrom ?? sessions[sessions.length - 1]?.id].filter((v): v is string => Boolean(v))),
  );
  const [all, setAll] = useState(false);
  const hidden = all ? 0 : Math.max(0, sessions.length - VISIBLE_SESSIONS);
  const shown = sessions.slice(hidden);
  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const t = journey.totals;
  const stats: [string, string][] = [
    ["Visits", t.sessions.toLocaleString()],
    ["Pages", t.pageviews.toLocaleString()],
    ["On screen", formatDuration(t.engagedMs)],
    ["Clicks", t.events.toLocaleString()],
    ["Enquiries", t.enquiries.toLocaleString()],
  ];

  return (
    <div className="min-w-0">
      <dl className="mb-4 grid grid-cols-3 gap-2 min-[400px]:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-sharp border border-line bg-canvas/60 px-2.5 py-2">
            <dt className="truncate font-mono text-[0.5625rem] font-medium uppercase tracking-[0.08em] text-muted">{label}</dt>
            <dd className="mt-0.5 font-mono text-[0.9375rem] tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      {!journey.historyComplete ? (
        <p className="mb-3 text-[0.75rem] text-muted">Earlier visits are older than the retention period and no longer stored.</p>
      ) : null}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mb-3 inline-flex min-h-8 items-center gap-1 text-[0.8125rem] font-medium text-accent hover:underline pointer-coarse:min-h-11 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <AdminIcon name="chevronUp" size={14} />
          Show {hidden} earlier {hidden === 1 ? "visit" : "visits"}
        </button>
      ) : null}
      {sessions.length === 0 ? (
        <p className="text-[0.8125rem] text-muted">No visits recorded for this browser.</p>
      ) : (
        <ol aria-label="Visits, oldest first" className="min-w-0">
          {shown.map((s, i) => (
            <SessionItem
              key={s.id}
              session={s}
              index={hidden + i + 1}
              enquiries={enquiries}
              currentId={currentId}
              open={openIds.has(s.id)}
              onToggle={() => toggle(s.id)}
              last={i === shown.length - 1}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Loads the visitor's journey once per visitor id (mount with key={visitorId}). */
function useJourney(visitorId: string): JourneyState {
  const { loadJourney } = useAdminData();
  const [state, setState] = useState<JourneyState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    void loadJourney(visitorId).then((result) => {
      if (!alive) return;
      setState(result.ok ? { status: "done", journey: result.journey } : { status: "error", message: result.message });
    });
    return () => {
      alive = false;
    };
  }, [visitorId, loadJourney]);
  return state;
}

function JourneyBlock({ contact, visitorId }: { contact: ContactDoc; visitorId: string }) {
  const { report } = useAdminData();
  const state = useJourney(visitorId);
  const fromJourney = state.status === "done" ? (state.journey.enquiries.find((q) => q.id === contact.id) ?? null) : null;
  const fromReport = report?.enquiries.find((q) => q.id === contact.id) ?? null;
  const enquiry = fromJourney ?? fromReport;
  const sessionIds = useMemo(() => new Set(report?.sessions.map((s) => s.id) ?? []), [report]);

  return (
    <>
      <section className="min-w-0">
        <SubHeading hint={DEFINITIONS.firstTouch}>Attribution</SubHeading>
        {!enquiry && state.status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : (
          <Attribution enquiry={enquiry} contact={contact} inReport={(id) => sessionIds.has(id)} />
        )}
      </section>

      <section className="min-w-0">
        <SubHeading
          actions={
            <a
              href={routes.visitor(visitorId)}
              className="inline-flex min-h-8 items-center gap-1 text-[0.8125rem] font-medium text-accent hover:underline pointer-coarse:min-h-11 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              In Analytics
              <AdminIcon name="arrowUpRight" size={14} />
            </a>
          }
        >
          Visitor journey
        </SubHeading>
        {state.status === "loading" ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : state.status === "error" ? (
          <Notice tone="error" title="Could not load the journey">
            {state.message}
          </Notice>
        ) : (
          <Timeline journey={state.journey} currentId={contact.id} />
        )}
      </section>
    </>
  );
}

export default function ContactJourney({ contact }: { contact: ContactDoc }) {
  const { report, analyticsLoading } = useAdminData();
  const visitorId = (contact.visitorId ?? "").trim();
  if (visitorId) return <JourneyBlock key={visitorId} contact={contact} visitorId={visitorId} />;
  const enquiry = report?.enquiries.find((q) => q.id === contact.id) ?? null;
  return (
    <section className="min-w-0">
      <SubHeading hint={DEFINITIONS.firstTouch}>Attribution</SubHeading>
      {!report && analyticsLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <Attribution enquiry={enquiry} contact={contact} inReport={() => false} />
      )}
      <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">
        No visitor id: tracking was off in this browser when the form was sent, so there is no journey to show.
      </p>
    </section>
  );
}
