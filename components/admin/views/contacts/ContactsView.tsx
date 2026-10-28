"use client";

import { useMemo, useRef, useState } from "react";
import type { ContactStatus } from "@/lib/firebase/schema";
import {
  AdminIcon,
  Button,
  DataTable,
  EmptyState,
  FilterChips,
  IconButton,
  Notice,
  PageHeader,
  SearchField,
  Section,
  Segmented,
  Select,
  StatusPill,
  Tag,
  buttonClass,
  cx,
  type Column,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  CONTACT_STATUS_META,
  contactMailHref,
  contactSearchValues,
  contactStatusOf,
  firstLine,
  initials,
  matchesQuery,
  timeAgo,
  timeOf,
} from "../../data/records";
import type { ContactDoc } from "../../data/types";
import { goBack, routes } from "../../shell/router";
import ContactDetail from "./ContactDetail";
import ContactInsights from "./ContactInsights";
import { CONTACT_PERIODS, FACET_LABEL, contactInsights, facetValue, periodMeta, type ContactPeriod, type Facet } from "./contactStats";
import { useContactActions } from "./useContactActions";

/**
 * Contacts: website contact-form submissions only (collection "contacts"). KPIs, submissions chart,
 * status pipeline and service / budget / source breakdowns on top; below, the inbox with status chips
 * (with counts), search, sort, facet filters, "new since your last visit" markers and CSV export of
 * the rows shown. Desktop shows a sortable table, phones a card list. Rows open the detail drawer
 * at #/contacts/<id>.
 */

type StatusFilter = "all" | ContactStatus;
type SortKey = "newest" | "oldest" | "name" | "waiting";
type FacetFilter = { kind: Facet; value: string } | null;
type ContactTab = "inbox" | "insights";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "waiting", label: "New first" },
  { value: "name", label: "Name A-Z" },
];

const STATUS_ORDER: Record<ContactStatus, number> = { new: 0, handled: 1, spam: 2 };

/** Filters survive switching sections during this visit (the view unmounts). */
const memory: { status: StatusFilter; query: string; sort: SortKey; period: ContactPeriod; facet: FacetFilter; fresh: boolean; tab: ContactTab } = {
  status: "all",
  query: "",
  sort: "newest",
  period: "30d",
  facet: null,
  fresh: false,
  tab: "inbox",
};

function useRemembered<K extends keyof typeof memory>(key: K): [(typeof memory)[K], (value: (typeof memory)[K]) => void] {
  const [value, setValue] = useState(memory[key]);
  return [
    value,
    (next) => {
      memory[key] = next;
      setValue(next);
    },
  ];
}

function Avatar({ name, fresh }: { name: string | undefined; fresh: boolean }) {
  return (
    <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 font-mono text-[0.75rem] font-medium text-fg">
      {initials(name)}
      {fresh ? (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-surface" aria-hidden="true" />
      ) : null}
    </span>
  );
}

/** "22 Oct, 14:05" for the table; the drawer shows the full date. */
function shortDate(date: Date | null | undefined): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function FreshLabel() {
  return <span className="sr-only">New since your last visit. </span>;
}

export default function ContactsView({ selectedId }: { selectedId: string | null }) {
  const { contacts, inboxLoading, inboxLoaded, inboxError, exportContacts, lastSeen, now, counts, markSeen, refresh, busyIds } = useAdminData();
  const { changeStatus } = useContactActions();

  const [status, setStatus] = useRemembered("status");
  const [query, setQuery] = useRemembered("query");
  const [sort, setSort] = useRemembered("sort");
  const [period, setPeriod] = useRemembered("period");
  const [facet, setFacet] = useRemembered("facet");
  const [freshWanted, setFreshOnly] = useRemembered("fresh");
  const [tab, setTab] = useRemembered("tab");
  const inboxRef = useRef<HTMLDivElement | null>(null);
  const switchTab = (next: ContactTab) => {
    setTab(next);
    document.getElementById("admin-main")?.scrollTo({ top: 0 });
  };

  const isFresh = (c: ContactDoc) => lastSeen.contacts > 0 && timeOf(c) > lastSeen.contacts;
  const freshCount = counts.contactsSinceLastVisit;
  // The "since last visit" filter switches itself off once the markers are cleared.
  const freshOnly = freshWanted && freshCount > 0;


  const insights = useMemo(() => contactInsights(contacts, period, now), [contacts, period, now]);

  const statusCounts = insights.status;

  const rows = useMemo(() => {
    const filtered = contacts.filter(
      (c) =>
        (status === "all" || contactStatusOf(c) === status) &&
        (!facet || facetValue(c, facet.kind) === facet.value) &&
        (!freshOnly || (lastSeen.contacts > 0 && timeOf(c) > lastSeen.contacts)) &&
        matchesQuery(query, contactSearchValues(c)),
    );
    const out = [...filtered];
    if (sort === "newest") out.sort((a, b) => timeOf(b) - timeOf(a));
    else if (sort === "oldest") out.sort((a, b) => timeOf(a) - timeOf(b));
    else if (sort === "name") out.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
    else out.sort((a, b) => STATUS_ORDER[contactStatusOf(a)] - STATUS_ORDER[contactStatusOf(b)] || timeOf(b) - timeOf(a));
    return out;
  }, [contacts, status, facet, freshOnly, lastSeen.contacts, query, sort]);

  const filtered = status !== "all" || Boolean(facet) || freshOnly || query.trim() !== "";
  const clearFilters = () => {
    setStatus("all");
    setFacet(null);
    setFreshOnly(false);
    setQuery("");
  };

  // Prev / next in the drawer follow the list as shown (or all contacts for a deep link outside it).
  const order = useMemo(() => {
    const ids = rows.map((c) => c.id);
    if (!selectedId || ids.includes(selectedId)) return ids;
    return [...contacts].sort((a, b) => timeOf(b) - timeOf(a)).map((c) => c.id);
  }, [rows, contacts, selectedId]);

  const columns: Column<ContactDoc>[] = [
    {
      key: "received",
      header: "Received",
      sortValue: (c) => timeOf(c),
      cell: (c) => (
        <div className="min-w-0">
          <div className={cx("flex items-center gap-1.5 whitespace-nowrap font-medium", isFresh(c) ? "text-accent" : "text-fg")}>
            {isFresh(c) ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" /> : null}
            {timeAgo(c.createdAt, now)}
          </div>
          <div className="mt-0.5 hidden whitespace-nowrap font-mono text-[0.6875rem] tabular-nums text-muted @5xl:block">{shortDate(c.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortValue: (c) => c.name ?? "",
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={c.name} fresh={isFresh(c)} />
          <div className="min-w-[8.5rem] max-w-[10rem] @5xl:max-w-[14rem]">
            <div className="line-clamp-1 font-medium text-fg [overflow-wrap:anywhere]">
              {isFresh(c) ? <FreshLabel /> : null}
              {c.name || "(no name)"}
            </div>
            <div className="line-clamp-1 text-[0.75rem] text-muted [overflow-wrap:anywhere]">{c.company || c.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "enquiry",
      header: "Enquiry",
      sortValue: (c) => c.service ?? "",
      cell: (c) => (
        <div className="min-w-0 max-w-[40rem]">
          <div className="line-clamp-1 text-fg [overflow-wrap:anywhere]">{c.service || "General enquiry"}</div>
          <div className="line-clamp-1 text-[0.75rem] text-muted [overflow-wrap:anywhere]">{firstLine(c.message, 160)}</div>
        </div>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      width: "9rem",
      hideBelow: "lg",
      sortValue: (c) => c.budget ?? "",
      cell: (c) => <span className={c.budget ? "text-fg" : "text-muted"}>{c.budget || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "7.5rem",
      sortValue: (c) => STATUS_ORDER[contactStatusOf(c)],
      cell: (c) => {
        const meta = CONTACT_STATUS_META[contactStatusOf(c)];
        return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "5.25rem",
      align: "right",
      cell: (c) => {
        const mail = contactMailHref(c);
        const s = contactStatusOf(c);
        return (
          <div className="flex items-center justify-end gap-1">
            {mail ? (
              <a href={mail} title="Reply by email" aria-label={`Reply to ${c.name || "contact"} by email`} className={buttonClass({ variant: "ghost", size: "sm", className: "size-8 px-0" })}>
                <AdminIcon name="send" size={16} />
              </a>
            ) : null}
            <IconButton
              size="sm"
              icon={s === "handled" ? "inbox" : "check"}
              label={s === "handled" ? "Move back to new" : "Mark handled"}
              disabled={busyIds.has(c.id)}
              onClick={() => void changeStatus(c.id, s === "handled" ? "new" : "handled")}
            />
          </div>
        );
      },
    },
  ];

  const renderCard = (c: ContactDoc) => {
    const meta = CONTACT_STATUS_META[contactStatusOf(c)];
    const fresh = isFresh(c);
    return (
      <div className="flex min-w-0 gap-3">
        <Avatar name={c.name} fresh={fresh} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-[0.9375rem] font-medium text-fg">
              {fresh ? <FreshLabel /> : null}
              {c.name || "(no name)"}
            </p>
            <span className={cx("shrink-0 text-[0.75rem] tabular-nums", fresh ? "font-medium text-accent" : "text-muted")}>{timeAgo(c.createdAt, now)}</span>
          </div>
          <p className="truncate text-[0.8125rem] text-muted">{[c.company, c.service].filter(Boolean).join(" · ") || c.email}</p>
          {c.message ? <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-fg/80 [overflow-wrap:anywhere]">{c.message}</p> : null}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusPill size="sm" tone={meta.tone}>
              {meta.label}
            </StatusPill>
            {c.budget ? <Tag icon="wallet">{c.budget}</Tag> : null}
            {c.note ? <Tag icon="note">Note</Tag> : null}
          </div>
        </div>
      </div>
    );
  };

  // Status and facet picks from the KPIs / charts show the filtered inbox.
  const showInbox = () => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      inboxRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    } else switchTab("inbox");
  };

  const insightProps = {
    insights,
    loading: !inboxLoaded && inboxLoading,
    now,
    period,
    status,
    onStatus: (next: StatusFilter) => {
      setStatus(next);
      showInbox();
    },
    facet,
    onFacet: (next: FacetFilter) => {
      setFacet(next);
      if (next) showInbox();
    },
  };

  const periodControl = (block: boolean) => (
    <Segmented<ContactPeriod>
      block={block}
      size="sm"
      ariaLabel="Period"
      value={period}
      onChange={setPeriod}
      options={CONTACT_PERIODS.map((p) => ({ value: p.value, label: p.label, title: p.title }))}
    />
  );

  const exportLabel = filtered ? `Export ${rows.length.toLocaleString()} shown` : "Export CSV";

  return (
    <div className="min-w-0">
      <PageHeader
        title="Contacts"
        description="Messages from the contact form on the website. Landing-page leads are under Landing page."
        actions={
          <Button icon="download" onClick={() => exportContacts(rows)} disabled={!rows.length} title="Download the rows shown as a CSV file">
            {exportLabel}
          </Button>
        }
      />

      {inboxError ? (
        <Notice
          tone="error"
          role="alert"
          title="Could not load contacts"
          className="mb-4"
          action={
            <Button size="sm" icon="refresh" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        >
          {inboxError}
        </Notice>
      ) : null}

      {freshCount > 0 ? (
        <Notice
          title={`${freshCount} new ${freshCount === 1 ? "contact" : "contacts"} since your last visit`}
          className="mb-4"
          action={
            <>
              <Button size="sm" variant={freshOnly ? "subtle" : "primary"} onClick={() => setFreshOnly(!freshOnly)}>
                {freshOnly ? "Show all" : "Show them"}
              </Button>
              <Button size="sm" variant="ghost" onClick={markSeen} title="Clears the markers for contacts and landing leads">
                Mark as seen
              </Button>
            </>
          }
        >
          Marked with an orange dot below.
        </Notice>
      ) : null}

      {/* Phones and tablets: Inbox and Insights are two tabs. Desktop shows KPIs, inbox, then insights. */}
      <div className="mb-4 lg:hidden">
        <Segmented<ContactTab>
          block
          ariaLabel="Show"
          value={tab}
          onChange={switchTab}
          options={[
            { value: "inbox", label: statusCounts.new ? `Inbox · ${statusCounts.new} new` : "Inbox" },
            { value: "insights", label: "Insights" },
          ]}
        />
      </div>

      <div className={cx(tab !== "insights" && "hidden lg:block")}>
        <div className="mb-3 lg:hidden">{periodControl(true)}</div>
        <ContactInsights part="kpis" {...insightProps} />
      </div>

      <div ref={inboxRef} className={cx("scroll-mt-4 lg:mt-7", tab !== "inbox" && "hidden lg:block")}>
      <Section
        title="Inbox"
        description={
          filtered
            ? `${rows.length.toLocaleString()} of ${contacts.length.toLocaleString()} submissions match`
            : `${contacts.length.toLocaleString()} submissions, newest first, whatever the period${contacts.length >= 1000 ? " (only the latest 1,000 are loaded)" : ""}`
        }
      >
        <div className="mb-3 flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <FilterChips
            ariaLabel="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: contacts.length },
              { value: "new", label: "New", tone: "accent", count: statusCounts.new },
              { value: "handled", label: "Handled", tone: "green", count: statusCounts.handled },
              { value: "spam", label: "Spam", tone: "red", count: statusCounts.spam },
            ]}
          />
          <div className="flex min-w-0 gap-2">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search contacts"
              placeholder="Search contacts…"
              className="min-w-0 flex-1 xl:w-80 xl:flex-none"
            />
            <Select label="Sort" value={sort} onChange={setSort} options={SORTS} className="w-[7.75rem] shrink-0" />
          </div>
        </div>

        {facet || freshOnly ? (
          <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
            {facet ? (
              <button
                type="button"
                onClick={() => setFacet(null)}
                className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 pl-3 pr-2 text-[0.8125rem] text-fg transition-colors hover:border-accent pointer-coarse:min-h-10 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="text-muted">{FACET_LABEL[facet.kind]}:</span>
                <span className="min-w-0 truncate">{facet.value}</span>
                <AdminIcon name="close" size={14} label={`Remove ${FACET_LABEL[facet.kind].toLowerCase()} filter`} />
              </button>
            ) : null}
            {freshOnly ? (
              <button
                type="button"
                onClick={() => setFreshOnly(false)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 pl-3 pr-2 text-[0.8125rem] text-fg transition-colors hover:border-accent pointer-coarse:min-h-10 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                Since your last visit
                <AdminIcon name="close" size={14} label="Remove since-last-visit filter" />
              </button>
            ) : null}
            <button type="button" onClick={clearFilters} className="min-h-8 px-1 text-[0.8125rem] font-medium text-accent hover:underline pointer-coarse:min-h-10">
              Clear all
            </button>
          </div>
        ) : null}

        <DataTable
          caption="Contact-form submissions"
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          rowHref={(c) => routes.contacts(c.id)}
          selectedKey={selectedId}
          loading={inboxLoading && !inboxLoaded}
          resetKey={`${status}|${query}|${sort}|${facet?.kind}:${facet?.value}|${freshOnly}`}
          sortResetKey={sort}
          rowLabel={(c) => `Open ${c.name || c.email || "contact"}, ${CONTACT_STATUS_META[contactStatusOf(c)].label}`}
          renderCard={renderCard}
          rowClassName={(c) => (isFresh(c) ? "bg-accent/[0.035]" : undefined)}
          empty={
            contacts.length === 0 ? (
              <EmptyState
                icon="mail"
                title={inboxLoaded ? "No contact-form submissions yet" : "Loading contacts…"}
                description="Messages from the contact form on the website appear here the moment they arrive."
              />
            ) : (
              <EmptyState
                icon="search"
                title="No contacts match"
                description="Try another status, search or filter."
                action={
                  <Button size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            )
          }
        />
      </Section>
      </div>

      <div className={cx("mt-3 lg:mt-7", tab !== "insights" && "hidden lg:block")}>
        <Section
          title="Insights"
          description={`Real enquiries (spam left out), ${periodMeta(period).title.toLowerCase()}. Tap a bar to filter the inbox.`}
          actions={<span className="hidden lg:block">{periodControl(false)}</span>}
        >
          <ContactInsights part="charts" {...insightProps} />
        </Section>
      </div>

      <ContactDetail contactId={selectedId} order={order} onClose={() => goBack(routes.contacts())} />
    </div>
  );
}
