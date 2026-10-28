"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatNumber } from "@/lib/analytics/report";
import { RETENTION_DAYS } from "@/lib/firebase/schema";
import { useAdminData } from "../../data/AdminDataProvider";
import { initials } from "../../data/records";
import { Button, Card, CardHeader, KeyValue, Notice, StatusPill, cx, eyebrow } from "../../kit";
import { RowDivider, StepList } from "./parts";

/**
 * Settings side cards: Account (who is signed in, sign out), Data & privacy (retention purge, what is
 * loaded, CSV exports), Install & app info (Home Screen steps for the coming admin app, how this copy
 * runs) and Keyboard shortcuts (the ones the shell defines; hidden on touch-only layouts).
 */

export function AccountCard() {
  const { email, signOut, mode } = useAdminData();
  return (
    <Card aria-labelledby="settings-account">
      <CardHeader id="settings-account" icon="user" title="Account" />
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/12 font-mono text-[0.875rem] font-semibold uppercase text-accent"
        >
          {initials(email.split("@")[0]?.replace(/[._-]+/g, " ")) || "A"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-medium text-fg [overflow-wrap:anywhere]">{email || "Signed in"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusPill tone="green" size="sm">
              Administrator
            </StatusPill>
            {mode === "demo" ? (
              <StatusPill tone="yellow" size="sm">
                Demo data
              </StatusPill>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
        Signed in with Firebase. Only addresses on the admin list can open this panel; the database rules check it on every request.
      </p>
      <Button variant="danger" icon="logOut" block className="mt-4" onClick={signOut}>
        Sign out
      </Button>
    </Card>
  );
}

export function DataCard() {
  const { purge, contacts, leads, analytics, lastLoadedAt, refresh, truncated, exportContacts, exportLeads, exportPageviews, rangeLabel, mode } =
    useAdminData();
  const [refreshing, setRefreshing] = useState(false);
  const months = Math.round(RETENTION_DAYS / 30.4);

  async function reload() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card aria-labelledby="settings-data">
      <CardHeader
        id="settings-data"
        icon="layers"
        title="Data & privacy"
        actions={
          <Button size="sm" variant="ghost" icon="refresh" loading={refreshing} onClick={() => void reload()}>
            Reload
          </Button>
        }
      />

      <p className={eyebrow}>Retention</p>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted text-pretty">
        Page views and events older than <strong className="font-medium text-fg">{RETENTION_DAYS} days</strong> (about {months} months, as the
        privacy policy states) are deleted automatically each time the admin opens. Contact and landing enquiries are never deleted
        automatically.
      </p>
      <p className="mt-2 flex items-center gap-2 text-[0.8125rem] text-fg">
        <span
          aria-hidden="true"
          className={cx("size-2 shrink-0 rounded-full", purge ? "bg-[#6fd49a]" : "animate-pulse bg-muted motion-reduce:animate-none")}
        />
        {purge
          ? purge.deleted > 0
            ? `${formatNumber(purge.deleted)} old records removed at ${formatDateTime(purge.at)}`
            : `Checked at ${formatDateTime(purge.at)}: nothing old enough to remove`
          : mode === "demo"
            ? "Not run in demo mode"
            : "Clean-up runs in the background after opening"}
      </p>

      <RowDivider />

      <p className={eyebrow}>Loaded now</p>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        {[
          { label: "Contacts", value: formatNumber(contacts.length) },
          { label: "Landing leads", value: formatNumber(leads.length) },
          { label: "Page views", value: analytics ? formatNumber(analytics.pageviews.length) : "…" },
          { label: "Events", value: analytics ? formatNumber(analytics.events.length) : "…" },
        ].map((item) => (
          <div key={item.label} className="min-w-0 rounded-sharp border border-line bg-canvas/60 px-3 py-2">
            <dt className="truncate text-[0.75rem] text-muted">{item.label}</dt>
            <dd className="mt-0.5 font-mono text-[1rem] tabular-nums text-fg">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[0.75rem] leading-relaxed text-muted text-pretty">
        Last loaded {lastLoadedAt ? formatDateTime(lastLoadedAt) : "…"}. Page views and events cover the last {rangeLabel} plus the period before
        it for comparison; the newest 1,000 contacts and 1,000 leads are loaded whatever the range.
      </p>
      {truncated.length ? (
        <Notice tone="warning" title="Some data was cut off" className="mt-3">
          {truncated.join("; ")}. Pick a shorter range for complete figures.
        </Notice>
      ) : null}

      <RowDivider />

      <p className={eyebrow}>Export (CSV)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" icon="download" onClick={() => exportContacts()} disabled={contacts.length === 0}>
          Contacts
        </Button>
        <Button size="sm" icon="download" onClick={() => exportLeads()} disabled={leads.length === 0}>
          Leads
        </Button>
        <Button size="sm" icon="download" onClick={exportPageviews} disabled={!analytics}>
          Page views
        </Button>
      </div>
    </Card>
  );
}

type DisplayInfo = { standalone: boolean; worker: "yes" | "no" | "unsupported" | "checking"; host: string };

export function AppCard() {
  const { mode } = useAdminData();
  const [info, setInfo] = useState<DisplayInfo>({ standalone: false, worker: "checking", host: "" });

  useEffect(() => {
    let cancelled = false;
    let standalone = false;
    let host = "";
    try {
      const nav = navigator as Navigator & { standalone?: boolean };
      standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
      host = window.location.host;
    } catch {
      /* no matchMedia */
    }
    setInfo({ standalone, worker: "checking", host });
    if (!("serviceWorker" in navigator)) {
      setInfo({ standalone, worker: "unsupported", host });
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!cancelled) setInfo({ standalone, worker: registration ? "yes" : "no", host });
      })
      .catch(() => {
        if (!cancelled) setInfo({ standalone, worker: "no", host });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card aria-labelledby="settings-app">
      <CardHeader
        id="settings-app"
        icon="smartphone"
        title="Admin app"
        actions={
          <StatusPill tone={info.standalone ? "green" : "muted"} size="sm">
            {info.standalone ? "Installed" : "In browser"}
          </StatusPill>
        }
      />
      <p className="text-[0.8125rem] leading-relaxed text-muted text-pretty">
        Install <strong className="font-medium text-fg">admin.brightonsolution.com</strong> on your phone: it opens
        full-screen like an app and receives instant push alerts (turn push on under Enquiry alerts).
      </p>

      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div className="min-w-0">
          <p className={cx(eyebrow, "mb-2")}>Android · Chrome</p>
          <StepList steps={[<>Open the admin address in Chrome.</>, <>Tap <strong>⋮</strong> then <strong>Install app</strong>.</>, <>Open it from the home screen and allow alerts.</>]} />
        </div>
        <div className="min-w-0">
          <p className={cx(eyebrow, "mb-2")}>iPhone · Safari</p>
          <StepList steps={[<>Open the admin address in Safari.</>, <>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.</>, <>Open it from the home screen and allow alerts.</>]} />
        </div>
      </div>

      <RowDivider />

      <KeyValue
        items={[
          { label: "Address", value: info.host || "…", mono: true },
          { label: "Data", value: mode === "demo" ? "Demo (sample data, dev only)" : "Live (Firestore)" },
          { label: "Service worker", value: info.worker === "checking" ? "…" : info.worker === "yes" ? "Registered" : info.worker === "no" ? "Not registered" : "Not supported" },
          { label: "Build", value: process.env.NODE_ENV === "production" ? "Production" : "Development" },
        ]}
      />
    </Card>
  );
}

const SHORTCUTS: readonly { keys: string[]; action: string }[] = [
  { keys: ["Ctrl / ⌘", "K"], action: "Search contacts and leads" },
  { keys: ["←", "→"], action: "Move through a focused chart" },
  { keys: ["Enter"], action: "Open the first search result" },
  { keys: ["Esc"], action: "Close a panel, popover or search" },
  { keys: ["Enter"], action: "Open the focused table row" },
  { keys: ["Tab"], action: "Move between controls" },
];

export function ShortcutsCard() {
  return (
    <Card aria-labelledby="settings-keys">
      <CardHeader id="settings-keys" icon="zap" title="Keyboard shortcuts" />
      <dl className="divide-y divide-line">
        {SHORTCUTS.map((s) => (
          <div key={s.action} className="flex min-w-0 items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="min-w-0 text-[0.8125rem] text-muted">{s.action}</dt>
            <dd className="flex shrink-0 gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="inline-flex min-w-7 items-center justify-center rounded-[0.4rem] border border-line-strong border-b-2 bg-surface-2 px-1.5 py-0.5 font-mono text-[0.75rem] text-fg"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
