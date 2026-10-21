"use client";

import { Fragment, useMemo, useState } from "react";
import { LEAD_LIMITS, LEAD_STATUSES, type LeadRecord, type LeadStatus } from "@/lib/firebase/schema";
import { formatDateTime, formatNumber, formatPercent, type WithMeta } from "@/lib/analytics/report";
import { AdminButton, inputClass, panelClass } from "@/components/admin/ui";
import { PLAN_UNSURE, plans } from "@/lib/content/launch";
import { formatPrice } from "@/lib/launch/lead";
import { LAUNCH_PATH, site } from "@/lib/site";

export type LeadDoc = WithMeta<LeadRecord>;

type StatusFilter = "all" | LeadStatus;
type KindFilter = "all" | "brief" | "plan";

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "border-accent/60 bg-accent/10 text-accent",
  contacted: "border-[#7fb4ff]/50 bg-[#7fb4ff]/10 text-[#9cc5ff]",
  won: "border-[#6fd49a]/50 bg-[#6fd49a]/10 text-[#8fe2b1]",
  lost: "border-line-strong bg-surface-2 text-muted",
  spam: "border-[#ff8a7a]/60 bg-[#ff8a7a]/10 text-[#ff8a7a]",
};

const PLAN_NAMES = [...plans.map((plan) => plan.name), PLAN_UNSURE];

function statusOf(lead: LeadDoc): LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(lead.status ?? "") ? (lead.status as LeadStatus) : "new";
}

function timeOf(lead: LeadDoc): number {
  return lead.createdAt instanceof Date ? lead.createdAt.getTime() : 0;
}

function firstName(lead: LeadDoc): string {
  return (lead.name ?? "").trim().split(/\s+/)[0] ?? "";
}

function mailHref(lead: LeadDoc): string {
  const email = (lead.email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "";
  const subject = encodeURIComponent(`Your ${lead.plan && lead.plan !== PLAN_UNSURE ? `${lead.plan} plan` : "project"} with ${site.name}`);
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${subject}`;
}

/** International digits for wa.me and tel:, guessing +91 for a bare 10-digit number from an Indian time zone. */
function phoneDigits(lead: LeadDoc): string {
  const raw = (lead.phone ?? "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const india = lead.timeZone === "Asia/Kolkata" || lead.timeZone === "Asia/Calcutta";
  if (raw.startsWith("00")) digits = digits.slice(2);
  else if (!raw.startsWith("+") && india) {
    if (digits.length === 10) digits = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

function whatsappHref(lead: LeadDoc): string {
  const digits = phoneDigits(lead);
  if (!digits) return "";
  const about = lead.plan && lead.plan !== PLAN_UNSURE ? `the ${lead.plan} plan` : "your project";
  const text = `Hi ${firstName(lead) || "there"}, this is ${site.name}. Thank you for your enquiry about ${about}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function telHref(lead: LeadDoc): string {
  const digits = phoneDigits(lead);
  return digits ? `tel:+${digits}` : "";
}

function sourceOf(lead: LeadDoc): string {
  const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ");
  if (utm) return utm;
  if (lead.referrer) {
    try {
      return new URL(lead.referrer).hostname.replace(/^www\./, "");
    } catch {
      return lead.referrer;
    }
  }
  return "Direct link";
}

function priceOf(lead: LeadDoc): string {
  if (typeof lead.price !== "number" || !lead.currency) return "";
  return formatPrice(lead.price, lead.currency);
}

export type LandingStats = { views: number; visitors: number } | null;

export default function LeadsPanel({
  leads,
  landing,
  rangeLabel,
  since,
  lastSeen,
  busyId,
  onStatus,
  onNote,
}: {
  leads: LeadDoc[];
  landing: LandingStats;
  rangeLabel: string;
  since: Date;
  /** Leads created after this time (ms) are marked as new since the last visit. */
  lastSeen: number;
  busyId: string | null;
  onStatus: (id: string, status: LeadStatus) => void;
  onNote: (id: string, note: string) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [plan, setPlan] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const sorted = useMemo(() => [...leads].sort((a, b) => timeOf(b) - timeOf(a)), [leads]);

  const stats = useMemo(() => {
    const byStatus: Record<StatusFilter, number> = { all: 0, new: 0, contacted: 0, won: 0, lost: 0, spam: 0 };
    const byPlan = new Map<string, number>();
    let inRange = 0;
    let week = 0;
    const weekAgo = Date.now() - 7 * 86_400_000;
    for (const lead of sorted) {
      const state = statusOf(lead);
      byStatus.all += 1;
      byStatus[state] += 1;
      if (state === "spam") continue;
      const name = lead.plan || PLAN_UNSURE;
      byPlan.set(name, (byPlan.get(name) ?? 0) + 1);
      if (timeOf(lead) >= since.getTime()) inRange += 1;
      if (timeOf(lead) >= weekAgo) week += 1;
    }
    return { byStatus, byPlan, inRange, week };
  }, [sorted, since]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sorted.filter((lead) => {
      if (status !== "all" && statusOf(lead) !== status) return false;
      if (kind !== "all" && lead.kind !== kind) return false;
      if (plan !== "all" && (lead.plan || PLAN_UNSURE) !== plan) return false;
      if (!needle) return true;
      return [lead.name, lead.email, lead.phone, lead.company, lead.projectTypes, lead.message, lead.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [sorted, status, kind, plan, query]);

  const conversion = landing && landing.visitors > 0 ? stats.inRange / landing.visitors : null;

  const kpis = [
    { label: "Total leads", value: formatNumber(stats.byStatus.all) },
    { label: "Waiting for a reply", value: formatNumber(stats.byStatus.new), accent: stats.byStatus.new > 0 },
    { label: "Last 7 days", value: formatNumber(stats.week) },
    {
      label: `Landing page, ${rangeLabel}`,
      value: landing ? `${formatNumber(stats.inRange)} / ${formatNumber(landing.visitors)}` : formatNumber(stats.inRange),
      note: conversion !== null ? `leads / visitors: ${formatPercent(conversion, 1)} converted` : "leads in range",
    },
  ];

  return (
    <div className="min-w-0">
      <p className="mb-5 text-[0.8125rem] text-muted">
        Enquiries from the private page <code className="font-mono text-fg">{LAUNCH_PATH}</code>: full project briefs and
        plan requests, newest first, regardless of the selected range.
      </p>

      <dl className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className={`min-w-0 p-4 md:p-5 ${panelClass} ${item.accent ? "border-accent/60" : ""}`}>
            <dt className="eyebrow eyebrow-dense text-muted">{item.label}</dt>
            <dd
              className={`mt-3 font-mono text-[clamp(1.25rem,1.05rem+0.8vw,1.75rem)] leading-none tracking-[-0.02em] tabular-nums ${
                item.accent ? "text-accent" : "text-fg"
              }`}
            >
              {item.value}
            </dd>
            {item.note ? <dd className="mt-2 text-[0.75rem] text-muted">{item.note}</dd> : null}
          </div>
        ))}
      </dl>

      {/* Plan interest: each tile filters the table. */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {PLAN_NAMES.map((name) => {
          const selected = plan === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={selected}
              onClick={() => setPlan(selected ? "all" : name)}
              className={`flex min-h-[64px] min-w-0 items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${panelClass} ${
                selected ? "border-accent" : "hover:border-line-strong"
              }`}
            >
              <span className="min-w-0 text-[0.8125rem] text-muted">
                <span className="block truncate text-fg">{name}</span>
                {name === PLAN_UNSURE ? "no plan picked" : "plan interest"}
              </span>
              <span className="font-mono text-[1.25rem] tabular-nums text-fg">{formatNumber(stats.byPlan.get(name) ?? 0)}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label="Filter leads by status" className="flex flex-wrap gap-2">
          {(["all", ...LEAD_STATUSES] as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={status === key}
              onClick={() => setStatus(key)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-sharp border px-3 text-[0.8125rem] transition-colors ${
                status === key ? "border-accent bg-accent text-canvas" : "border-line-strong bg-surface text-fg hover:border-fg/60"
              }`}
            >
              {key === "all" ? "All" : STATUS_LABEL[key]}
              <span className="font-mono tabular-nums opacity-70">{stats.byStatus[key]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="leads-kind">
            Type of lead
          </label>
          <select
            id="leads-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as KindFilter)}
            className={`${inputClass} sm:w-44`}
          >
            <option value="all">All types</option>
            <option value="brief">Full brief</option>
            <option value="plan">Plan request</option>
          </select>
          <label className="sr-only" htmlFor="leads-search">
            Search leads
          </label>
          <input
            id="leads-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone…"
            className={`${inputClass} sm:w-64`}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className={`mt-4 px-5 py-6 text-[0.875rem] text-muted ${panelClass}`}>
          {leads.length === 0
            ? `No leads yet. Share ${site.url.replace(/^https?:\/\//, "")}${LAUNCH_PATH} and they will appear here.`
            : "No leads match these filters."}
        </p>
      ) : (
        <div className={`mt-4 overflow-x-auto ${panelClass}`}>
          <table className="w-full min-w-[1080px] border-collapse text-left text-[0.8125rem]">
            <caption className="sr-only">Landing page leads, newest first</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                {["Received", "Name", "Contact", "Interest", "Project", "Budget and timeline", "Source", "Status", ""].map(
                  (header) => (
                    <th key={header || "actions"} scope="col" className="eyebrow eyebrow-dense whitespace-nowrap px-4 py-3 font-medium">
                      {header || <span className="sr-only">Details</span>}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => {
                const state = statusOf(lead);
                const fresh = timeOf(lead) > lastSeen;
                const expanded = open === lead.id;
                const mail = mailHref(lead);
                const wa = whatsappHref(lead);
                const tel = telHref(lead);
                const price = priceOf(lead);
                return (
                  <Fragment key={lead.id}>
                    <tr className={`border-b border-line align-top ${fresh ? "bg-accent/[0.05]" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[0.75rem] tabular-nums text-muted">
                        {formatDateTime(lead.createdAt)}
                        {fresh ? (
                          <span className="mt-1.5 block w-fit rounded-sharp bg-accent px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold text-canvas">
                            New since last visit
                          </span>
                        ) : null}
                      </td>
                      <td className="min-w-[10rem] px-4 py-3.5">
                        <span className="block font-medium text-fg break-words">{lead.name || "(no name)"}</span>
                        {lead.company ? <span className="block text-muted break-words">{lead.company}</span> : null}
                      </td>
                      <td className="min-w-[15rem] px-4 py-3.5">
                        {mail ? (
                          <a href={mail} className="block [overflow-wrap:anywhere] text-accent underline-offset-4 hover:underline">
                            {lead.email}
                          </a>
                        ) : (
                          <span className="block break-all text-muted">{lead.email}</span>
                        )}
                        <span className="mt-1 block whitespace-nowrap text-fg">{lead.phone}</span>
                        {lead.contactPref ? <span className="block text-muted">Prefers {lead.contactPref}</span> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block font-medium text-fg">{lead.plan || PLAN_UNSURE}</span>
                        {price ? <span className="block font-mono text-[0.75rem] text-muted">{price}</span> : null}
                        <span className="mt-1 block text-muted">{lead.kind === "plan" ? "Plan request" : "Full brief"}</span>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3.5">
                        <span className="block text-fg">{lead.projectTypes || "-"}</span>
                        {lead.stage ? <span className="mt-1 block text-muted">{lead.stage}</span> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block whitespace-nowrap text-fg">{lead.budget || "-"}</span>
                        {lead.timeline ? <span className="mt-1 block text-muted">{lead.timeline}</span> : null}
                      </td>
                      <td className="max-w-[11rem] px-4 py-3.5 break-words text-muted">{sourceOf(lead)}</td>
                      <td className="px-4 py-3.5">
                        <label className="sr-only" htmlFor={`lead-status-${lead.id}`}>
                          Status of {lead.name}
                        </label>
                        <select
                          id={`lead-status-${lead.id}`}
                          value={state}
                          disabled={busyId === lead.id}
                          onChange={(event) => onStatus(lead.id, event.target.value as LeadStatus)}
                          className={`min-h-[36px] rounded-sharp border px-2 text-[0.8125rem] font-medium [color-scheme:dark] disabled:opacity-60 ${STATUS_STYLE[state]}`}
                        >
                          {LEAD_STATUSES.map((item) => (
                            <option key={item} value={item} className="bg-surface text-fg">
                              {STATUS_LABEL[item]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <AdminButton
                          aria-expanded={expanded}
                          aria-controls={`lead-details-${lead.id}`}
                          onClick={() => setOpen(expanded ? null : lead.id)}
                          className="min-h-[36px] px-3"
                        >
                          {expanded ? "Hide" : "Details"}
                        </AdminButton>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr id={`lead-details-${lead.id}`} className="border-b border-line bg-canvas/60">
                        <td colSpan={9} className="px-4 py-5">
                          <LeadDetails lead={lead} mail={mail} wa={wa} tel={tel} onNote={onNote} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeadDetails({
  lead,
  mail,
  wa,
  tel,
  onNote,
}: {
  lead: LeadDoc;
  mail: string;
  wa: string;
  tel: string;
  onNote: (id: string, note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState(lead.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<"idle" | "ok" | "error">("idle");

  const details: [string, string | undefined][] = [
    ["Features", lead.features],
    ["Stage", lead.stage],
    ["Timeline", lead.timeline],
    ["Budget", lead.budget],
    ["Currency", lead.currency],
    ["Page", lead.page],
    ["Referrer", lead.referrer],
    ["UTM", [lead.utmSource, lead.utmMedium, lead.utmCampaign, lead.utmTerm, lead.utmContent].filter(Boolean).join(" / ")],
    ["Language", lead.language],
    ["Time zone", lead.timeZone],
    ["Updated", lead.updatedAt ? formatDateTime(lead.updatedAt) : undefined],
  ];

  async function save() {
    setSaving(true);
    setSaved("idle");
    const ok = await onNote(lead.id, note.slice(0, LEAD_LIMITS.note));
    setSaving(false);
    setSaved(ok ? "ok" : "error");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center rounded-sharp bg-accent px-4 text-[0.8125rem] font-semibold text-canvas hover:bg-accent-2"
            >
              WhatsApp {lead.name ? firstName(lead) : ""}
            </a>
          ) : null}
          {tel ? (
            <a href={tel} className="inline-flex min-h-[40px] items-center rounded-sharp border border-line-strong px-4 text-[0.8125rem] text-fg hover:border-fg/60">
              Call
            </a>
          ) : null}
          {mail ? (
            <a href={mail} className="inline-flex min-h-[40px] items-center rounded-sharp border border-line-strong px-4 text-[0.8125rem] text-fg hover:border-fg/60">
              Email
            </a>
          ) : null}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {details
            .filter(([, value]) => Boolean(value && String(value).trim()))
            .map(([label, value]) => (
              <div key={label} className="flex min-w-0 gap-3">
                <dt className="w-24 shrink-0 text-muted">{label}</dt>
                <dd className="min-w-0 break-words text-fg">{value}</dd>
              </div>
            ))}
        </dl>

        <div className="mt-5">
          <p className="text-muted">Message</p>
          <p className="mt-1 max-w-[70ch] whitespace-pre-wrap break-words rounded-sharp border border-line bg-surface p-4 text-[0.875rem] leading-relaxed text-fg">
            {lead.message || "No message."}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor={`lead-note-${lead.id}`} className="block text-muted">
          Private note
        </label>
        <textarea
          id={`lead-note-${lead.id}`}
          value={note}
          maxLength={LEAD_LIMITS.note}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved("idle");
          }}
          rows={5}
          placeholder="Call summary, quote sent, next step…"
          className={`${inputClass} mt-1 min-h-32 resize-y py-2.5`}
        />
        <div className="mt-2 flex items-center gap-3">
          <AdminButton variant="primary" onClick={() => void save()} disabled={saving || note === (lead.note ?? "")}>
            {saving ? "Saving…" : "Save note"}
          </AdminButton>
          <span role="status" className={`text-[0.75rem] ${saved === "error" ? "text-[#ff8a7a]" : "text-muted"}`}>
            {saved === "ok" ? "Saved" : saved === "error" ? "Could not save" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
