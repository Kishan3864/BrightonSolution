"use client";

import { useMemo, useState } from "react";
import { DEFINITIONS, formatDateTime, formatDuration, formatNumber, type SessionDetail, type SessionEvent, type SessionPage } from "@/lib/analytics/report";
import { useAdminData } from "../../data/AdminDataProvider";
import { CONTACT_STATUS_META, contactStatusOf, safeHttpUrl } from "../../data/records";
import {
  AdminIcon,
  CopyButton,
  Drawer,
  EmptyState,
  IconButton,
  KeyValue,
  LinkButton,
  Notice,
  StatusPill,
  Tag,
  cx,
  ChannelPill,
  CountryCode,
  DrawerHeading,
  EventPill,
  MiniStat,
} from "../../kit";
import { goBack, navigate, routes } from "../../shell/router";
import { deviceIcon, deviceLabel, eventMeta, eventText, formatLoad, shortId } from "../../data/analytics";

/**
 * Session detail drawer (#/analytics/sessions/<id>): the visit's page path as a timeline with time on
 * page, scroll depth and load time, the events in between, any enquiry sent from it, attribution
 * (channel, source, referrer, UTM) and the device. Newer/older buttons step through the session list.
 */

export function clockTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Short outcome of a session for pills: enquiry > form sent > engaged > bounced. */
export function sessionOutcome(s: Pick<SessionDetail, "enquiryIds" | "submitted" | "engaged">): { label: string; tone: "green" | "blue" | "muted" } {
  if (s.enquiryIds.length) return { label: "Enquiry", tone: "green" };
  if (s.submitted) return { label: "Form sent", tone: "green" };
  if (s.engaged) return { label: "Engaged", tone: "blue" };
  return { label: "Bounced", tone: "muted" };
}

type Step = { kind: "page"; at: number; page: SessionPage } | { kind: "event"; at: number; event: SessionEvent };

function PageStep({ page, last }: { page: SessionPage; last: boolean }) {
  const scroll = page.scrollDepth;
  return (
    <li className="relative flex min-w-0 gap-3 pb-4">
      {!last ? <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-line-strong" /> : null}
      <span className="relative z-[1] inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-accent/12 font-mono text-[0.6875rem] font-medium text-accent">
        {page.pageIndex || "·"}
      </span>
      <div className="min-w-0 flex-1 rounded-sharp border border-line bg-canvas/50 px-3 py-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[0.8125rem] text-fg [overflow-wrap:anywhere]">{page.path}</p>
            {page.title ? <p className="truncate text-[0.75rem] text-muted">{page.title}</p> : null}
          </div>
          <time dateTime={page.at.toISOString()} className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted">
            {clockTime(page.at)}
          </time>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-muted">
          <span className="inline-flex items-center gap-1" title="Time on screen">
            <AdminIcon name="clock" size={12} />
            <span className="font-mono tabular-nums text-fg">{formatDuration(page.durationMs)}</span>
          </span>
          {scroll !== null ? (
            <span className="inline-flex min-w-0 items-center gap-1.5" title={DEFINITIONS.scrollDepth}>
              <AdminIcon name="scroll" size={12} />
              <span aria-hidden="true" className="relative h-1.5 w-14 overflow-hidden rounded-full bg-fg/[0.08]">
                <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, scroll))}%` }} />
              </span>
              <span className="font-mono tabular-nums text-fg">{Math.round(scroll)}%</span>
              <span className="sr-only">scrolled</span>
            </span>
          ) : null}
          {page.loadMs !== null ? (
            <span className="inline-flex items-center gap-1" title={DEFINITIONS.loadTime}>
              <AdminIcon name="zap" size={12} />
              <span className="font-mono tabular-nums text-fg">{formatLoad(page.loadMs)}</span> load
            </span>
          ) : null}
          {page.segments > 1 ? <Tag>resumed {page.segments - 1}×</Tag> : null}
          {!page.inRange ? <Tag>outside range</Tag> : null}
        </div>
      </div>
    </li>
  );
}

function EventStep({ event, last }: { event: SessionEvent; last: boolean }) {
  const meta = eventMeta(event.type, event.label);
  return (
    <li className="relative flex min-w-0 gap-3 pb-3">
      {!last ? <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-6 w-px bg-line-strong" /> : null}
      <span className="relative z-[1] inline-flex size-7 shrink-0 items-center justify-center">
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-muted">
          <AdminIcon name={meta.icon} size={11} />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
        <EventPill type={event.type} label={event.label} />
        <span className="min-w-0 text-[0.8125rem] text-fg [overflow-wrap:anywhere]">{eventText(event)}</span>
        <time dateTime={event.at.toISOString()} className="ml-auto shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted">
          {clockTime(event.at)}
        </time>
      </div>
    </li>
  );
}

export default function SessionDrawer({ sessionId, orderedIds }: { sessionId: string | null; orderedIds: readonly string[] }) {
  const { report, contacts } = useAdminData();
  // Keep showing the last session while the drawer animates closed.
  const [lastId, setLastId] = useState<string | null>(sessionId);
  if (sessionId && sessionId !== lastId) setLastId(sessionId);
  const id = sessionId ?? lastId;
  const session = useMemo(() => (id && report ? report.sessions.find((s) => s.id === id) ?? null : null), [id, report]);

  const steps = useMemo<Step[]>(() => {
    if (!session) return [];
    const list: Step[] = [
      ...session.pages.map((page) => ({ kind: "page" as const, at: page.at.getTime(), page })),
      ...session.events.map((event) => ({ kind: "event" as const, at: event.at.getTime(), event })),
    ];
    return list.sort((a, b) => a.at - b.at || (a.kind === "page" ? -1 : 1));
  }, [session]);

  const close = () => goBack(routes.analytics("sessions"));
  const index = id ? orderedIds.indexOf(id) : -1;
  const newer = index > 0 ? orderedIds[index - 1] : null;
  const older = index >= 0 && index < orderedIds.length - 1 ? orderedIds[index + 1] : null;
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const outcome = session ? sessionOutcome(session) : null;
  const durationMs = session ? session.end.getTime() - session.start.getTime() : 0;

  return (
    <Drawer
      open={Boolean(sessionId)}
      onClose={close}
      size="lg"
      backLabel="Sessions"
      title={session ? `Session · ${formatDateTime(session.start)}` : "Session"}
      subtitle={session ? `${session.channel}${session.source && session.source !== "(direct)" ? ` · ${session.source}` : ""} · ${session.pageCount} page${session.pageCount === 1 ? "" : "s"}` : undefined}
      headerActions={
        orderedIds.length > 1 && index >= 0 ? (
          <>
            <IconButton icon="chevronUp" label="Newer session" disabled={!newer} onClick={() => newer && navigate(routes.session(newer), { replace: true })} />
            <IconButton icon="chevronDown" label="Older session" disabled={!older} onClick={() => older && navigate(routes.session(older), { replace: true })} />
          </>
        ) : null
      }
      footer={
        session ? (
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href={routes.visitor(session.visitorId)} icon="user" variant="primary" data-autofocus>
              Visitor journey
            </LinkButton>
            <CopyButton value={session.id} label="Copy session id" showLabel />
          </div>
        ) : undefined
      }
    >
      {!session ? (
        <EmptyState
          compact
          icon="search"
          title="Session not in this range"
          description="It may be older than the selected range or still loading. Pick a longer range in the top bar."
        />
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {outcome ? <StatusPill tone={outcome.tone}>{outcome.label}</StatusPill> : null}
            <ChannelPill channel={session.channel} />
            <StatusPill tone={session.isNewVisitor ? "accent" : "muted"} dot={false}>
              {session.isNewVisitor ? "New visitor" : session.visitNumber ? `Visit #${session.visitNumber}` : "Returning visitor"}
            </StatusPill>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Pages" value={formatNumber(session.pageCount)} />
            <MiniStat label="On screen" value={formatDuration(session.engagedMs)} sub={`span ${formatDuration(durationMs)}`} />
            <MiniStat label="Events" value={formatNumber(session.events.length)} />
            <MiniStat label="Load" value={formatLoad(session.loadMs)} sub="first page" />
          </div>

          {!session.landingInData ? (
            <Notice tone="warning" title="Started before the loaded data">
              {DEFINITIONS.partialSession}
            </Notice>
          ) : null}

          {session.enquiryIds.length ? (
            <section>
              <DrawerHeading icon="mail">Enquiry sent in this session</DrawerHeading>
              <ul className="space-y-2">
                {session.enquiryIds.map((eid) => {
                  const contact = contactById.get(eid);
                  const status = contact ? contactStatusOf(contact) : null;
                  return (
                    <li key={eid}>
                      <a
                        href={routes.contacts(eid)}
                        className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-sharp border border-line bg-canvas/50 px-3 py-2 hover:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[0.875rem] font-medium text-fg">{contact?.name || "Contact"}</span>
                          <span className="block truncate text-[0.75rem] text-muted">{contact?.email || contact?.service || eid}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {status ? <StatusPill tone={CONTACT_STATUS_META[status].tone} size="sm">{CONTACT_STATUS_META[status].label}</StatusPill> : null}
                          <AdminIcon name="chevronRight" size={16} className="text-muted" />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <DrawerHeading icon="activity" aside={`${clockTime(session.start)} – ${clockTime(session.end)}`}>
              Path through the site
            </DrawerHeading>
            {steps.length ? (
              <ol aria-label="Pages and events in order">
                {steps.map((step, i) =>
                  step.kind === "page" ? (
                    <PageStep key={`p${step.page.pageIndex}-${i}`} page={step.page} last={i === steps.length - 1} />
                  ) : (
                    <EventStep key={`e${step.event.id}`} event={step.event} last={i === steps.length - 1} />
                  ),
                )}
              </ol>
            ) : (
              <p className="text-[0.8125rem] text-muted">No pages recorded.</p>
            )}
            <p className="mt-1 text-[0.75rem] text-muted">{DEFINITIONS.times}</p>
          </section>

          <section>
            <DrawerHeading icon="link">Where it came from</DrawerHeading>
            <KeyValue
              items={[
                { label: "Channel", value: session.channel },
                { label: "Source", value: session.source },
                {
                  label: "Referrer",
                  wide: true,
                  mono: true,
                  value: session.referrer ? (
                    safeHttpUrl(session.referrer) ? (
                      <a
                        href={safeHttpUrl(session.referrer) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-accent hover:underline"
                      >
                        {session.referrer}
                      </a>
                    ) : (
                      // Not an http(s) URL: shown as text only, never as a link.
                      <span>{session.referrer}</span>
                    )
                  ) : (
                    ""
                  ),
                },
                { label: "Landing page", value: session.landingInData ? session.landing : "(not set)", mono: true },
                { label: "Exit page", value: session.exit, mono: true },
                { label: "utm_source", value: session.utmSource, mono: true },
                { label: "utm_medium", value: session.utmMedium, mono: true },
                { label: "utm_campaign", value: session.utmCampaign, mono: true },
                { label: "utm_term", value: session.utmTerm, mono: true },
                { label: "utm_content", value: session.utmContent, mono: true },
              ]}
            />
          </section>

          <section>
            <DrawerHeading icon={deviceIcon(session.device)}>Visitor and device</DrawerHeading>
            <KeyValue
              items={[
                {
                  label: "Visitor",
                  mono: true,
                  value: (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <a
                        href={routes.visitor(session.visitorId)}
                        className="inline-flex min-h-11 items-center text-accent hover:underline pointer-fine:min-h-0"
                        title={session.visitorId}
                      >
                        {shortId(session.visitorId, 12)}
                      </a>
                      <CopyButton value={session.visitorId} label="Copy visitor id" />
                    </span>
                  ),
                },
                { label: "Device", value: deviceLabel(session.device) },
                { label: "Browser", value: session.browser },
                { label: "Operating system", value: session.os },
                { label: "Screen", value: session.screen, mono: true },
                { label: "Window", value: session.viewport, mono: true },
                {
                  label: "Country",
                  value: session.country ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CountryCode code={session.country.code} />
                      {session.country.name}
                    </span>
                  ) : (
                    ""
                  ),
                },
                { label: "Time zone", value: session.timeZone, mono: true },
                { label: "Language", value: session.language, mono: true },
                { label: "Session id", value: session.id, mono: true, wide: true },
              ]}
            />
          </section>

          {!session.inRange ? (
            <p className={cx("text-[0.75rem] text-muted")}>This session falls outside the selected range and is shown for context only.</p>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}
