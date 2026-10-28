"use client";

import { useEffect, type ReactNode } from "react";
import { formatDateTime } from "@/lib/analytics/report";
import { parseUserAgent } from "@/lib/analytics/ua";
import { LEAD_LIMITS } from "@/lib/firebase/schema";
import {
  AdminIcon,
  Button,
  CopyButton,
  Drawer,
  EmptyState,
  IconButton,
  KeyValue,
  LinkButton,
  Skeleton,
  StatusPill,
  Tag,
  NoteEditor,
  cx,
  eyebrow,
  surface,
  type AdminIconName,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import {
  LEAD_STATUS_META,
  PLAN_UNSURE,
  leadKindLabel,
  leadMailHref,
  leadSource,
  leadStatusOf,
  leadTelHref,
  leadWhatsappHref,
  planOf,
  priceOf,
  referrerLabel,
  safeHttpUrl,
  timeAgo,
  timeOf,
} from "../../data/records";
import type { LeadDoc } from "../../data/types";
import { navigate, routes } from "../../shell/router";
import LeadJourney from "./LeadJourney";
import { LeadStatusPicker } from "./LeadStatusControls";
import { splitList } from "./leadStats";

/**
 * Detail panel for one landing-page lead (#/landing/<id>; notifications deep-link here). Every field
 * of the lead, grouped: summary (status, plan and price), status changer, contact with copy buttons,
 * message, project, private note, marketing (UTM, referrer), visitor journey and technical details.
 * Quick actions (WhatsApp, call, email) sit in a sticky footer within thumb reach on phones.
 * `order` (ids of the filtered list) enables previous / next lead buttons.
 */
export default function LeadDetail({
  leadId,
  onClose,
  order,
}: {
  leadId: string | null;
  onClose: () => void;
  order?: readonly string[];
}) {
  const { leads, inboxLoaded, lastSeen, now } = useAdminData();
  const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
  const index = lead && order ? order.indexOf(lead.id) : -1;
  const prevId = index > 0 ? order?.[index - 1] : undefined;
  const nextId = index >= 0 && order && index < order.length - 1 ? order[index + 1] : undefined;
  const go = (id: string | undefined) => id && navigate(routes.landing(id), { replace: true });

  // j / k step through the list (not while typing; arrow keys stay free for scrolling).
  useEffect(() => {
    if (!lead) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey || event.altKey) return;
      const stepTo = event.key === "k" ? prevId : event.key === "j" ? nextId : undefined;
      if (stepTo) navigate(routes.landing(stepTo), { replace: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lead, prevId, nextId]);

  const open = Boolean(leadId);
  const fresh = lead ? lastSeen.leads > 0 && timeOf(lead) > lastSeen.leads : false;

  const headerActions =
    lead && order && order.length > 1 ? (
      <>
        <IconButton icon="chevronUp" label="Previous lead" disabled={!prevId} onClick={() => go(prevId)} />
        <IconButton icon="chevronDown" label="Next lead" disabled={!nextId} onClick={() => go(nextId)} />
      </>
    ) : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      backLabel="Leads"
      title={lead ? lead.name || "(no name)" : inboxLoaded ? "Lead not found" : "Loading lead…"}
      subtitle={lead ? `${leadKindLabel(lead)} · ${timeAgo(lead.createdAt, now)}` : undefined}
      headerActions={headerActions}
      footer={lead ? <QuickActions lead={lead} /> : undefined}
    >
      {lead ? (
        <LeadBody key={lead.id} lead={lead} fresh={fresh} />
      ) : inboxLoaded ? (
        <EmptyState
          icon="rocket"
          title="This lead is not loaded"
          description="It may have been deleted, or it is older than the newest 1,000 leads."
          action={
            <Button icon="chevronLeft" onClick={onClose}>
              Back to all leads
            </Button>
          }
        />
      ) : (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </Drawer>
  );
}

/* --------------------------------------------------------------------- body */

function LeadBody({ lead, fresh }: { lead: LeadDoc; fresh: boolean }) {
  const { setLeadStatus, busyIds } = useAdminData();
  const status = leadStatusOf(lead);
  const meta = LEAD_STATUS_META[status];
  const price = priceOf(lead);
  const plan = planOf(lead);
  const ua = lead.userAgent ? parseUserAgent(lead.userAgent) : null;
  const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign, lead.utmTerm, lead.utmContent].some(Boolean);

  return (
    <div className="min-w-0 space-y-6">
      {/* Summary */}
      <div className={cx(surface.well, "min-w-0 p-4")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          {fresh ? (
            <span className="rounded-[0.4rem] bg-accent px-1.5 py-0.5 text-[0.6875rem] font-semibold text-canvas">New since last visit</span>
          ) : null}
          <Tag icon={lead.kind === "plan" ? "layers" : "briefcase"}>{leadKindLabel(lead)}</Tag>
          {lead.currency ? <Tag icon="wallet">{lead.currency}</Tag> : null}
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-1">
          {/* A plan request (or a brief that named a plan) leads with the plan; a plain brief with what to build. */}
          <div className="min-w-0">
            <p className={eyebrow}>{lead.plan ? "Plan interest" : "Project"}</p>
            <p className="mt-0.5 font-display text-[1.375rem] font-medium leading-tight tracking-[-0.02em] text-fg [overflow-wrap:anywhere]">
              {lead.plan ? (plan === PLAN_UNSURE ? "Help me choose a plan" : `${plan} plan`) : lead.projectTypes || "Project brief"}
            </p>
          </div>
          {price ? (
            <p className="font-mono text-[1.375rem] leading-tight tabular-nums text-accent">{price}</p>
          ) : lead.budget ? (
            <p className="text-[0.9375rem] text-fg">
              <span className="text-muted">Budget </span>
              {lead.budget}
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-[0.8125rem] text-muted">
          Received {formatDateTime(lead.createdAt)}
          {lead.company ? ` · ${lead.company}` : ""}
        </p>
      </div>

      <DetailSection title="Status" icon="target">
        <LeadStatusPicker name={`lead-status-${lead.id}`} value={status} busy={busyIds.has(lead.id)} onChange={(s) => void setLeadStatus(lead.id, s)} />
      </DetailSection>

      <DetailSection title="Contact" icon="user">
        <ContactRows lead={lead} />
      </DetailSection>

      <DetailSection title="Message" icon="message">
        {lead.message ? (
          <p className={cx(surface.well, "whitespace-pre-wrap p-3.5 text-[0.875rem] leading-relaxed text-fg [overflow-wrap:anywhere]")}>{lead.message}</p>
        ) : (
          <p className="text-[0.8125rem] text-muted">No message.</p>
        )}
      </DetailSection>

      <DetailSection title="Project" icon="briefcase">
        <KeyValue
          items={[
            { label: "Project types", value: <TagList values={splitList(lead.projectTypes)} />, wide: true },
            { label: "Features", value: <TagList values={splitList(lead.features)} />, wide: true },
            { label: "Stage", value: lead.stage },
            { label: "Timeline", value: lead.timeline },
            { label: "Budget", value: lead.budget },
          ]}
        />
        {!lead.projectTypes && !lead.features && !lead.stage && !lead.timeline && !lead.budget ? (
          <p className="text-[0.8125rem] text-muted">A plan request: no project details were asked.</p>
        ) : null}
      </DetailSection>

      <DetailSection title="Private note" icon="note">
        <LeadNote key={lead.id} lead={lead} />
      </DetailSection>

      <DetailSection title="Plan and price" icon="wallet">
        <KeyValue
          items={[
            { label: "Plan", value: plan },
            { label: "Price shown", value: price, mono: true },
            { label: "Currency", value: lead.currency },
            { label: "Type", value: leadKindLabel(lead) },
          ]}
        />
      </DetailSection>

      <DetailSection title="Marketing" icon="link">
        <KeyValue
          items={[
            { label: "Source", value: leadSource(lead), wide: true },
            { label: "UTM source", value: lead.utmSource },
            { label: "UTM medium", value: lead.utmMedium },
            { label: "UTM campaign", value: lead.utmCampaign },
            { label: "UTM term", value: lead.utmTerm },
            { label: "UTM content", value: lead.utmContent },
            {
              label: "Referrer",
              wide: true,
              value: lead.referrer ? (
                safeHttpUrl(lead.referrer) ? (
                  <a
                    href={safeHttpUrl(lead.referrer) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {referrerLabel(lead.referrer)}
                    <span className="ml-1 font-mono text-[0.75rem] text-muted">{lead.referrer}</span>
                  </a>
                ) : (
                  // Not an http(s) URL: shown as text only, never as a link.
                  <span className="font-mono text-[0.75rem] text-muted">{lead.referrer}</span>
                )
              ) : (
                ""
              ),
            },
            { label: "Page", value: lead.page, mono: true, wide: true },
          ]}
        />
        {!utm && !lead.referrer ? <p className="mt-2 text-[0.75rem] text-muted">Opened from a direct link (no UTM tags, no referrer).</p> : null}
      </DetailSection>

      <DetailSection title="Visitor journey" icon="activity">
        {lead.visitorId ? (
          <LeadJourney visitorId={lead.visitorId} leadTime={timeOf(lead)} />
        ) : (
          <p className="text-[0.8125rem] leading-relaxed text-muted">
            No visitor id came with this lead (analytics were blocked or declined in that browser), so the visits before it are unknown.
          </p>
        )}
      </DetailSection>

      <DetailSection title="Technical" icon="monitor">
        <KeyValue
          items={[
            {
              label: "Device",
              value: ua
                ? [ua.device, [ua.browser, ua.browserVersion].filter(Boolean).join(" "), [ua.os, ua.osVersion].filter(Boolean).join(" ")]
                    .filter(Boolean)
                    .join(" · ")
                : "",
            },
            { label: "Language", value: lead.language },
            { label: "Time zone", value: lead.timeZone },
            { label: "Updated", value: lead.updatedAt ? formatDateTime(lead.updatedAt) : "" },
            { label: "Visitor id", value: lead.visitorId ? <IdValue value={lead.visitorId} label="Copy visitor id" /> : "", wide: true },
            { label: "Lead id", value: <IdValue value={lead.id} label="Copy lead id" />, wide: true },
            { label: "User agent", value: lead.userAgent, mono: true, wide: true },
          ]}
        />
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: AdminIconName; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className={cx(eyebrow, "mb-2.5 flex items-center gap-1.5")}>
        <AdminIcon name={icon} size={13} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function TagList({ values }: { values: string[] }) {
  if (values.length === 0) return null;
  return (
    <span className="flex min-w-0 flex-wrap gap-1.5 pt-0.5">
      {values.map((v) => (
        <Tag key={v} className="text-fg">
          {v}
        </Tag>
      ))}
    </span>
  );
}

function IdValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 font-mono text-[0.8125rem] [overflow-wrap:anywhere]">{value}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}

/* ------------------------------------------------------------------ contact */

function ContactRows({ lead }: { lead: LeadDoc }) {
  const mail = leadMailHref(lead);
  const tel = leadTelHref(lead);
  const rows: { key: string; icon: AdminIconName; label: string; value: string; href?: string; copy?: boolean }[] = [];
  if (lead.email) rows.push({ key: "email", icon: "mail", label: "Email", value: lead.email, href: mail || undefined, copy: true });
  if (lead.phone) rows.push({ key: "phone", icon: "phone", label: "Phone", value: lead.phone, href: tel || undefined, copy: true });
  if (lead.company) rows.push({ key: "company", icon: "building", label: "Company", value: lead.company });
  if (lead.contactPref) rows.push({ key: "pref", icon: "message", label: "Prefers", value: lead.contactPref });
  if (rows.length === 0) return <p className="text-[0.8125rem] text-muted">No contact details.</p>;
  return (
    <ul className={cx(surface.well, "min-w-0 divide-y divide-line")}>
      {rows.map((row) => (
        <li key={row.key} className="relative flex min-h-12 min-w-0 items-center gap-3 px-3 py-2">
          <AdminIcon name={row.icon} size={16} className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">{row.label}</p>
            {row.href ? (
              // The whole row is the tap target (stretched ::after); the copy button sits above it.
              <a
                href={row.href}
                className="block text-[0.875rem] text-accent underline-offset-4 [overflow-wrap:anywhere] after:absolute after:inset-0 hover:underline focus:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
              >
                {row.value}
              </a>
            ) : (
              <p className="text-[0.875rem] text-fg [overflow-wrap:anywhere]">{row.value}</p>
            )}
          </div>
          {row.copy ? (
            <span className="relative z-10 shrink-0">
              <CopyButton value={row.value} label={`Copy ${row.label.toLowerCase()}`} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function QuickActions({ lead }: { lead: LeadDoc }) {
  const wa = leadWhatsappHref(lead);
  const tel = leadTelHref(lead);
  const mail = leadMailHref(lead);
  if (!wa && !tel && !mail) return <p className="text-center text-[0.8125rem] text-muted">No usable phone number or email address.</p>;
  const preferMail = /mail/i.test(lead.contactPref ?? "");
  const preferCall = /call|phone/i.test(lead.contactPref ?? "");
  const primary = preferMail && mail ? "mail" : preferCall && tel ? "tel" : wa ? "wa" : tel ? "tel" : "mail";
  const actions = [
    wa && { key: "wa", href: wa, icon: "whatsapp" as const, label: "WhatsApp", external: true },
    tel && { key: "tel", href: tel, icon: "phone" as const, label: "Call", external: false },
    mail && { key: "mail", href: mail, icon: "mail" as const, label: "Email", external: false },
  ].filter((a): a is { key: string; href: string; icon: "whatsapp" | "phone" | "mail"; label: string; external: boolean } => Boolean(a));
  return (
    <div className={cx("grid gap-2", actions.length === 3 ? "grid-cols-3" : actions.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {actions.map((a) => (
        <LinkButton
          key={a.key}
          href={a.href}
          icon={a.icon}
          block
          variant={a.key === primary ? "primary" : "secondary"}
          target={a.external ? "_blank" : undefined}
          rel={a.external ? "noopener noreferrer" : undefined}
        >
          {a.label}
        </LinkButton>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- note */

function LeadNote({ lead }: { lead: LeadDoc }) {
  const { setLeadNote, busyIds } = useAdminData();
  return (
    <NoteEditor
      value={lead.note ?? ""}
      onSave={(note) => setLeadNote(lead.id, note)}
      maxLength={LEAD_LIMITS.note}
      label="Only you can see this note"
      hint="Call summary, quote sent, next step. Ctrl + Enter saves."
      busy={busyIds.has(lead.id)}
    />
  );
}
