"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import AdminIcon from "../kit/AdminIcon";
import { Button, IconButton } from "../kit/Button";
import { SearchField } from "../kit/Inputs";
import { SourceBadge, StatusPill } from "../kit/Pills";
import Popover from "../kit/Popover";
import { Segmented } from "../kit/Tabs";
import { cx } from "../kit/cx";
import { useAdminData } from "../data/AdminDataProvider";
import { CONTACT_STATUS_META, LEAD_STATUS_META, contactSearchValues, leadSearchValues, matchesQuery, timeAgo } from "../data/records";
import { RANGES, type InboxItem, type RangeKey } from "../data/types";
import { ANALYTICS_TAB_ITEMS, navItem } from "./nav";
import { navigate, type Route } from "./router";

/**
 * Sticky top bar of the content area. Phones: logo + section name, search, alerts, refresh, and on
 * analytics routes a second row with the range switch. md+: breadcrumb, range switch (analytics),
 * inline search (Ctrl/Cmd + K focuses it), refresh and the alerts bell. Search finds contacts and landing
 * leads by name, email, phone, company or message; the bell lists everything still marked new.
 */
export default function TopBar({ route }: { route: Route }) {
  const { mode, analyticsLoading, inboxLoading, refresh } = useAdminData();
  const section = navItem(route.view);
  const tab = route.view === "analytics" ? ANALYTICS_TAB_ITEMS.find((t) => t.key === route.tab) : undefined;
  const busy = analyticsLoading || inboxLoading;

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-canvas/85 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 md:pl-0">
      <div className="flex h-14 min-w-0 items-center gap-1.5 px-3 sm:px-4 md:h-16 md:gap-2 md:px-6 lg:px-8">
        {/* Phone: brand mark + section */}
        <a
          href="#/overview"
          aria-label="Overview"
          className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sharp focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:hidden"
        >
          <LogoMark className="size-7" />
        </a>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="min-w-0 truncate text-[1rem] font-semibold tracking-[-0.01em] text-fg md:hidden">{section.label}</p>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
            <ol className="flex min-w-0 items-center gap-1.5 text-[0.875rem]">
              <li className="shrink-0 text-muted">Admin</li>
              <li aria-hidden="true" className="text-muted/50">
                /
              </li>
              <li className={cx("min-w-0 truncate", tab ? "text-muted" : "font-medium text-fg")}>
                {tab ? (
                  <a href={section.href} className="hover:text-fg">
                    {section.label}
                  </a>
                ) : (
                  section.label
                )}
              </li>
              {tab ? (
                <>
                  {/* The tab crumb needs room the range switch takes on tablets; the tabs show it there. */}
                  <li aria-hidden="true" className="hidden text-muted/50 xl:block">
                    /
                  </li>
                  <li className="hidden min-w-0 truncate font-medium text-fg xl:block">{tab.label}</li>
                </>
              ) : null}
            </ol>
          </nav>
          {mode === "demo" ? (
            <span
              className={cx(
                "hidden shrink-0 rounded-full border border-accent-2/40 bg-accent-2/10 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-accent-2",
                tab ? "xl:inline" : "sm:inline",
              )}
            >
              Demo data
            </span>
          ) : null}
        </div>

        {/* Responsive hiding sits on wrappers: "hidden" on the control itself would lose to its own inline-flex. */}
        {route.view === "analytics" ? (
          <div className="hidden md:block">
            <RangePicker />
          </div>
        ) : null}
        <GlobalSearch />
        <span className="hidden min-[360px]:block">
          <IconButton
            icon="refresh"
            label={busy ? "Refreshing…" : "Refresh data"}
            onClick={() => void refresh()}
            disabled={busy}
            className={cx(busy && "[&_svg]:animate-spin")}
          />
        </span>
        <Bell />
      </div>
      {route.view === "analytics" ? (
        <div className="border-t border-line px-3 py-2 sm:px-4 md:hidden">
          <RangePicker block />
        </div>
      ) : null}
    </header>
  );
}

/** 24h / 7d / 30d / 90d switch bound to the provider's range. */
export function RangePicker({ className, block = false }: { className?: string; block?: boolean }) {
  const { range, setRange } = useAdminData();
  return (
    <Segmented<RangeKey>
      ariaLabel="Date range"
      value={range}
      onChange={setRange}
      block={block}
      className={className}
      options={RANGES.map((r) => ({ value: r.key, label: r.short, title: `Last ${r.label}` }))}
    />
  );
}

/* ------------------------------------------------------------------- search */

function GlobalSearch() {
  const { contacts, leads, now } = useAdminData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchor = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const shortcut = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

  const results = useMemo<InboxItem[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const out: InboxItem[] = [];
    for (const c of contacts) if (matchesQuery(q, contactSearchValues(c))) out.push(toItem("contact", c.id, c.name, c.company, c.service || c.email, c.status, c.createdAt));
    for (const l of leads) if (matchesQuery(q, leadSearchValues(l))) out.push(toItem("landing", l.id, l.name, l.company, l.plan || l.projectTypes || l.email, l.status, l.createdAt));
    return out.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)).slice(0, 12);
  }, [query, contacts, leads]);

  const close = useCallback(() => setOpen(false), []);

  // Ctrl/Cmd + K focuses search (a modifier shortcut, so plain typing never triggers it), but not
  // while a drawer is open (the app behind it is inert).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (document.getElementById("admin-app")?.hasAttribute("inert")) return;
      event.preventDefault();
      setOpen(true);
      window.setTimeout(() => anchor.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (item: InboxItem) => {
    setOpen(false);
    setQuery("");
    navigate(item.href);
  };

  const list = (
    <div className="p-1.5">
      {query.trim().length < 2 ? (
        <p className="px-3 py-4 text-[0.8125rem] text-muted">Type at least 2 letters: name, email, phone, company or words from the message.</p>
      ) : results.length === 0 ? (
        <p className="px-3 py-4 text-[0.8125rem] text-muted">No contacts or leads match “{query.trim()}”.</p>
      ) : (
        <ul>
          {results.map((item) => (
            <li key={`${item.source}-${item.id}`}>
              <InboxRow item={item} now={now} onSelect={() => go(item)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div ref={anchor} className="relative">
      {/* md+: inline field */}
      <div className="hidden md:block">
        <SearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) go(results[0]);
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={`Search enquiries…  ${shortcut}`}
          label="Search contacts and leads"
          className="w-52 lg:w-56 xl:w-72"
        />
      </div>
      {/* Phone: icon that opens the panel with its own field */}
      <span className="block md:hidden">
        <IconButton
          icon="search"
          label="Search contacts and leads"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
        />
      </span>
      <Popover id={panelId} open={open && (query.length > 0 || isPhone())} onClose={close} anchorRef={anchor} label="Search results" width="26rem">
        <div className="border-b border-line p-2 md:hidden">
          <SearchField
            value={query}
            onChange={setQuery}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) go(results[0]);
            }}
            placeholder="Search contacts and leads"
            label="Search contacts and leads"
          />
        </div>
        {list}
      </Popover>
    </div>
  );
}

function isPhone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function toItem(
  source: InboxItem["source"],
  id: string,
  name: string | undefined,
  company: string | undefined,
  summary: string | undefined,
  status: string | undefined,
  createdAt: Date | null | undefined,
): InboxItem {
  return {
    source,
    id,
    name: name || "(no name)",
    company: company ?? "",
    email: "",
    phone: "",
    summary: summary ?? "",
    status: (status as InboxItem["status"]) ?? "new",
    createdAt: createdAt ?? null,
    fresh: false,
    href: source === "contact" ? `#/contacts/${encodeURIComponent(id)}` : `#/landing/${encodeURIComponent(id)}`,
  };
}

/** One enquiry row (search results, bell list): source badge, name, summary, status, time. */
export function InboxRow({ item, now, onSelect }: { item: InboxItem; now: number; onSelect?: () => void }) {
  const meta =
    item.source === "contact"
      ? CONTACT_STATUS_META[item.status as keyof typeof CONTACT_STATUS_META]
      : LEAD_STATUS_META[item.status as keyof typeof LEAD_STATUS_META];
  return (
    <a
      href={item.href}
      onClick={(event) => {
        if (onSelect) {
          event.preventDefault();
          onSelect();
        }
      }}
      className="flex min-h-12 items-start gap-3 rounded-[0.6rem] px-2.5 py-2 transition-colors hover:bg-fg/[0.05] focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <span className="mt-1.5 inline-flex size-2 shrink-0 rounded-full" style={{ backgroundColor: item.fresh ? "#ed943b" : "transparent" }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-[0.875rem] font-medium text-fg">{item.name}</span>
          <SourceBadge source={item.source} />
        </span>
        <span className="block truncate text-[0.75rem] text-muted">{[item.company, item.summary].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[0.6875rem] text-muted">{timeAgo(item.createdAt, now)}</span>
        {meta ? (
          <StatusPill tone={meta.tone} size="sm">
            {meta.label}
          </StatusPill>
        ) : null}
      </span>
    </a>
  );
}

/* --------------------------------------------------------------------- bell */

function Bell() {
  const { inbox, counts, now, notifications } = useAdminData();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const waiting = useMemo(() => inbox.filter((item) => item.status === "new").slice(0, 12), [inbox]);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={anchor} className="relative">
      <IconButton
        icon="bell"
        label="Enquiries waiting for a reply"
        badge={counts.unread}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={counts.unread ? "text-fg" : ""}
      />
      <Popover id={panelId} open={open} onClose={close} anchorRef={anchor} label="Waiting for a reply" width="24rem">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-[0.875rem] font-semibold text-fg">Waiting for a reply</p>
          <span className="font-mono text-[0.75rem] text-muted">{counts.unread}</span>
        </div>
        {notifications.permission === "default" ? (
          <div className="flex items-center gap-3 border-b border-line bg-accent/[0.06] px-4 py-3">
            <AdminIcon name="bell" size={18} className="shrink-0 text-accent" />
            <p className="min-w-0 flex-1 text-[0.8125rem] text-muted">Get a system alert for every new enquiry.</p>
            <Button size="sm" variant="primary" onClick={() => void notifications.request()}>
              Enable
            </Button>
          </div>
        ) : null}
        <div className="p-1.5">
          {waiting.length === 0 ? (
            <p className="px-3 py-6 text-center text-[0.8125rem] text-muted">All caught up. Nothing is waiting for a reply.</p>
          ) : (
            <ul onClick={() => setOpen(false)}>
              {waiting.map((item) => (
                <li key={`${item.source}-${item.id}`}>
                  <InboxRow item={item} now={now} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 border-t border-line p-2">
          <a href="#/contacts" onClick={close} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[0.6rem] text-[0.8125rem] font-medium text-fg hover:bg-fg/[0.05]">
            Contacts <span className="font-mono text-muted">{counts.newContacts}</span>
          </a>
          <a href="#/landing" onClick={close} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[0.6rem] text-[0.8125rem] font-medium text-fg hover:bg-fg/[0.05]">
            Landing <span className="font-mono text-muted">{counts.newLeads}</span>
          </a>
        </div>
      </Popover>
    </div>
  );
}
