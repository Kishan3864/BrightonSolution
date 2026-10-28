"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFINITIONS, formatDateTime, formatDuration, formatNumber, type Journey } from "@/lib/analytics/report";
import { useAdminData } from "../../data/AdminDataProvider";
import { CONTACT_STATUS_META } from "../../data/records";
import {
  AdminIcon,
  Button,
  CopyButton,
  Drawer,
  EmptyState,
  KeyValue,
  Notice,
  Skeleton,
  StatusPill,
  useToast,
  ChannelPill,
  CountryCode,
  DrawerHeading,
  MiniStat,
} from "../../kit";
import { goBack, routes } from "../../shell/router";
import { sessionOutcome } from "./SessionsTabSessionDrawer";
import { deviceIcon, deviceLabel, shortId } from "../../data/analytics";

/**
 * Visitor journey drawer (#/analytics/visitors/<id>): the full history of one anonymous browser, loaded
 * on open with loadJourney() (visitorJourney over every document of that visitor, not just the range).
 * Totals, first touch, device, enquiries sent, and every session with its page path. The browser can
 * be added to the excluded list (settings/dashboard) from here, e.g. a teammate's phone.
 */

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; journey: Journey };

export default function VisitorDrawer({ visitorId }: { visitorId: string | null }) {
  const { report, loadJourney, settings, settingsLoaded, saveExcludedVisitors } = useAdminData();
  const { toast } = useToast();
  const [lastId, setLastId] = useState<string | null>(visitorId);
  if (visitorId && visitorId !== lastId) setLastId(visitorId);
  const id = visitorId ?? lastId;

  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visitorId) return;
    let cancelled = false;
    setState({ status: "loading" });
    setConfirmExclude(false);
    void loadJourney(visitorId).then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "ok", journey: result.journey } : { status: "error", message: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [visitorId, loadJourney, attempt]);

  const reportSessions = useMemo(() => new Set(report?.sessions.map((s) => s.id) ?? []), [report]);
  const row = useMemo(() => (id && report ? report.visitors.find((v) => v.id === id) ?? null : null), [id, report]);
  const excluded = id ? settings.excludedVisitors.includes(id) : false;

  const exclude = async () => {
    if (!id || !settingsLoaded) return;
    setSaving(true);
    const result = await saveExcludedVisitors([...settings.excludedVisitors, id]);
    setSaving(false);
    setConfirmExclude(false);
    if (result.ok) toast({ tone: "success", title: "Browser excluded", description: "Its visits and clicks are now left out of every figure." });
    else toast({ tone: "error", title: "Could not exclude", description: result.message });
  };

  const journey = state.status === "ok" ? state.journey : null;
  const sessions = journey ? [...journey.sessions].reverse() : [];

  return (
    <Drawer
      open={Boolean(visitorId)}
      onClose={() => goBack(routes.analytics("sessions"))}
      size="lg"
      backLabel="Visitors"
      title={id ? `Visitor ${shortId(id, 10)}` : "Visitor"}
      subtitle={
        journey?.firstSeen
          ? `First seen ${formatDateTime(journey.firstSeen)}${journey.historyComplete ? "" : " (or earlier)"}`
          : row
            ? `Last seen ${formatDateTime(row.lastSeen)}`
            : undefined
      }
      footer={
        id ? (
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={id} label="Copy visitor id" showLabel />
            {excluded ? (
              <StatusPill tone="muted">Excluded from analytics</StatusPill>
            ) : confirmExclude ? (
              <>
                <Button variant="danger" icon="shield" loading={saving} onClick={() => void exclude()}>
                  Confirm exclude
                </Button>
                <Button variant="ghost" onClick={() => setConfirmExclude(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                icon="shield"
                onClick={() => setConfirmExclude(true)}
                disabled={!settingsLoaded}
                title={settingsLoaded ? DEFINITIONS.excludedVisitors : "The excluded list has not loaded yet (see Settings)."}
              >
                Exclude this browser
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {state.status === "loading" ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading the visitor journey">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : state.status === "error" ? (
        <Notice
          tone="error"
          role="alert"
          title="Could not load this visitor"
          action={
            <Button size="sm" icon="refresh" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          }
        >
          {state.message}
        </Notice>
      ) : !journey?.found ? (
        <EmptyState compact icon="user" title="No history for this visitor" description="Nothing was recorded for this id, or it is older than the retention period." />
      ) : (
        <div className="min-w-0 space-y-6">
          {confirmExclude ? (
            <Notice tone="warning" title="Exclude this browser?">
              {DEFINITIONS.excludedVisitors} You can undo it in Settings.
            </Notice>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Sessions" value={formatNumber(journey.totals.sessions)} sub={`${formatNumber(journey.totals.engagedSessions)} engaged`} />
            <MiniStat label="Page views" value={formatNumber(journey.totals.pageviews)} />
            <MiniStat label="On screen" value={formatDuration(journey.totals.engagedMs)} />
            <MiniStat label="Enquiries" value={formatNumber(journey.totals.enquiries)} sub={`${formatNumber(journey.totals.events)} events`} />
          </div>

          {!journey.historyComplete ? (
            <Notice title="Earlier visits not loaded">The first visit is older than the stored data, so the first touch shown is the oldest one available.</Notice>
          ) : null}

          {journey.enquiries.length ? (
            <section>
              <DrawerHeading icon="mail">Enquiries from this browser</DrawerHeading>
              <ul className="space-y-2">
                {journey.enquiries.map((enquiry) => (
                  <li key={enquiry.id}>
                    <a
                      href={routes.contacts(enquiry.id)}
                      className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-sharp border border-line bg-canvas/50 px-3 py-2 hover:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-medium text-fg">{enquiry.name || "Contact"}</span>
                        <span className="block truncate text-[0.75rem] text-muted">
                          {formatDateTime(enquiry.createdAt)}
                          {enquiry.service ? ` · ${enquiry.service}` : ""}
                          {enquiry.pagesBeforeEnquiry !== null ? ` · after ${enquiry.pagesBeforeEnquiry} pages` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusPill tone={CONTACT_STATUS_META[enquiry.status].tone} size="sm">
                          {CONTACT_STATUS_META[enquiry.status].label}
                        </StatusPill>
                        <AdminIcon name="chevronRight" size={16} className="text-muted" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <DrawerHeading icon="clock" aside={`${formatNumber(sessions.length)} total, newest first`}>
              Sessions
            </DrawerHeading>
            <ol className="space-y-2">
              {sessions.map((s) => {
                const outcome = sessionOutcome(s);
                const inReport = reportSessions.has(s.id);
                const body = (
                  <>
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.8125rem] font-medium text-fg">{formatDateTime(s.start)}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-muted">
                          <ChannelPill channel={s.channel} />
                          <span className="min-w-0 truncate">{s.source === "(direct)" ? "" : s.source}</span>
                        </p>
                      </div>
                      <StatusPill tone={outcome.tone} size="sm">
                        {outcome.label}
                      </StatusPill>
                    </div>
                    <p className="mt-2 font-mono text-[0.75rem] leading-relaxed text-fg [overflow-wrap:anywhere]">
                      {s.pages.length ? s.pages.map((p) => p.path).join("  →  ") : "(no pages)"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                      <span>{formatNumber(s.pageCount)} {s.pageCount === 1 ? "page" : "pages"}</span>
                      <span>{formatDuration(s.engagedMs)} on screen</span>
                      {s.events.length ? <span>{formatNumber(s.events.length)} events</span> : null}
                      <span className="inline-flex items-center gap-1">
                        <AdminIcon name={deviceIcon(s.device)} size={11} />
                        {s.browser || deviceLabel(s.device)}
                      </span>
                    </p>
                  </>
                );
                return (
                  <li key={s.id}>
                    {inReport ? (
                      <a
                        href={routes.session(s.id)}
                        className="block min-w-0 rounded-sharp border border-line bg-canvas/50 px-3 py-2.5 hover:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="min-w-0 rounded-sharp border border-line bg-canvas/30 px-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-[0.75rem] text-muted">Sessions in the selected range open in full; older ones are summarised.</p>
          </section>

          {journey.firstTouch ? (
            <section>
              <DrawerHeading icon="target">First touch</DrawerHeading>
              <KeyValue
                items={[
                  { label: "Channel", value: journey.firstTouch.channel },
                  { label: "Source", value: journey.firstTouch.source },
                  { label: "When", value: formatDateTime(journey.firstTouch.at) },
                  { label: "Landing page", value: journey.firstTouch.landing, mono: true },
                  { label: "Referrer", value: journey.firstTouch.referrer, mono: true, wide: true },
                  { label: "utm_source", value: journey.firstTouch.utmSource, mono: true },
                  { label: "utm_medium", value: journey.firstTouch.utmMedium, mono: true },
                  { label: "utm_campaign", value: journey.firstTouch.utmCampaign, mono: true },
                  { label: "utm_term", value: journey.firstTouch.utmTerm, mono: true },
                  { label: "utm_content", value: journey.firstTouch.utmContent, mono: true },
                ]}
              />
              <p className="mt-2 text-[0.75rem] text-muted">{DEFINITIONS.firstTouch}</p>
            </section>
          ) : null}

          <section>
            <DrawerHeading icon={deviceIcon(journey.device)}>Device (latest visit)</DrawerHeading>
            <KeyValue
              items={[
                {
                  label: "Country",
                  value: journey.country ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CountryCode code={journey.country.code} />
                      {journey.country.name}
                    </span>
                  ) : (
                    ""
                  ),
                },
                { label: "Device", value: deviceLabel(journey.device) },
                { label: "Browser", value: journey.browser },
                { label: "Operating system", value: journey.os },
                { label: "Screen", value: journey.screen, mono: true },
                { label: "Time zone", value: journey.timeZone, mono: true },
                { label: "Language", value: journey.language, mono: true },
                { label: "Last seen", value: formatDateTime(journey.lastSeen) },
                { label: "Visitor id", value: journey.visitorId, mono: true, wide: true },
              ]}
            />
          </section>
        </div>
      )}
    </Drawer>
  );
}
