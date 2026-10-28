"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CONTACT_LIMITS, type ContactStatus } from "@/lib/firebase/schema";
import { formatDateTime } from "@/lib/analytics/report";
import {
  AdminIcon,
  Button,
  CopyButton,
  Drawer,
  EmptyState,
  IconButton,
  KeyValue,
  LinkButton,
  Segmented,
  Skeleton,
  StatusPill,
  NoteEditor,
  type AdminIconName,
} from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { useMissingCheck } from "../../data/useMissingCheck";
import {
  CONTACT_STATUSES,
  CONTACT_STATUS_META,
  contactMailHref,
  contactStatusOf,
  contactTelHref,
  contactWhatsappHref,
  referrerLabel,
  timeAgo,
  timeOf,
} from "../../data/records";
import type { ContactDoc } from "../../data/types";
import { navigate, routes } from "../../shell/router";
import ContactJourney from "./ContactJourney";
import { useContactActions } from "./useContactActions";

/**
 * Detail drawer of one contact (#/contacts/<id>): quick replies (email with subject, WhatsApp, call),
 * copyable email and phone, the full message, every field the form sent, a private note, the status
 * changer (sticky footer, with undo), attribution and the visitor journey. Previous / next step
 * through the list as it is shown. Desktop: right panel; phones: full-screen sheet.
 */

function Block({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <h3 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ContactLine({ icon, label, value, href, copy }: { icon: AdminIconName; label: string; value: string; href?: string; copy?: boolean }) {
  return (
    <li className="relative flex min-h-11 min-w-0 items-center gap-3 px-3 py-1.5">
      <AdminIcon name={icon} size={16} className="shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="sr-only">{label}</p>
        {href ? (
          // The whole row is the tap target (stretched ::after); the copy button sits above it.
          <a
            href={href}
            className="text-[0.875rem] text-fg underline-offset-4 [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-sharp hover:text-accent hover:underline focus:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
          >
            {value}
          </a>
        ) : (
          <span className="text-[0.875rem] text-fg [overflow-wrap:anywhere]">{value}</span>
        )}
      </div>
      {copy ? (
        <span className="relative z-10 shrink-0">
          <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
        </span>
      ) : null}
    </li>
  );
}

function ContactNote({ contact }: { contact: ContactDoc }) {
  const { setContactNote, busyIds } = useAdminData();
  return (
    <NoteEditor
      value={contact.note ?? ""}
      onSave={(note) => setContactNote(contact.id, note)}
      maxLength={CONTACT_LIMITS.note}
      hint="Only visible here in the admin. Saved with the contact. Ctrl + Enter saves."
      placeholder="Called back on Monday, sending a quote by Friday…"
      busy={busyIds.has(contact.id)}
    />
  );
}

function DetailBody({ contact }: { contact: ContactDoc }) {
  const { now, lastSeen } = useAdminData();
  const status = contactStatusOf(contact);
  const meta = CONTACT_STATUS_META[status];
  const mail = contactMailHref(contact);
  const whatsapp = contactWhatsappHref(contact);
  const tel = contactTelHref(contact);
  const fresh = lastSeen.contacts > 0 && timeOf(contact) > lastSeen.contacts;
  const message = contact.message ?? "";
  const actions = [
    mail ? { key: "mail", href: mail, icon: "send" as const, label: "Reply", external: false } : null,
    whatsapp ? { key: "wa", href: whatsapp, icon: "whatsapp" as const, label: "WhatsApp", external: true } : null,
    tel ? { key: "tel", href: tel, icon: "phone" as const, label: "Call", external: false } : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <div className="space-y-7">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        {fresh ? <StatusPill tone="yellow">New since your last visit</StatusPill> : null}
        <span className="text-[0.8125rem] text-muted">
          Received {timeAgo(contact.createdAt, now)}
          {contact.updatedAt ? ` · updated ${timeAgo(contact.updatedAt, now)}` : ""}
        </span>
      </div>

      {actions.length ? (
        <div className={`grid gap-2 ${actions.length === 3 ? "grid-cols-3" : actions.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {actions.map((a, i) => (
            <LinkButton
              key={a.key}
              href={a.href}
              icon={a.icon}
              variant={i === 0 ? "primary" : "secondary"}
              block
              data-autofocus={i === 0 ? true : undefined}
              className="min-h-11 px-2 max-[359px]:flex-col max-[359px]:gap-1 max-[359px]:py-2 max-[359px]:text-[0.75rem]"
              {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {a.label}
            </LinkButton>
          ))}
        </div>
      ) : null}

      <Block title="Contact">
        <ul className="divide-y divide-line rounded-sharp border border-line bg-canvas/60">
          {contact.email ? <ContactLine icon="mail" label="Email" value={contact.email} href={mail || undefined} copy /> : null}
          {contact.phone ? <ContactLine icon="phone" label="Phone" value={contact.phone} href={tel || undefined} copy /> : null}
          {contact.company ? <ContactLine icon="building" label="Company" value={contact.company} /> : null}
        </ul>
      </Block>

      <Block
        title={`Message · ${message.length.toLocaleString()} characters`}
        actions={message ? <CopyButton value={message} label="Copy message" /> : null}
      >
        <p className="whitespace-pre-wrap rounded-sharp border border-line bg-canvas/60 p-4 text-[0.9375rem] leading-relaxed text-fg [overflow-wrap:anywhere]">
          {message || <span className="text-muted">(empty)</span>}
        </p>
      </Block>

      <Block title="Details">
        <KeyValue
          items={[
            { label: "Service", value: contact.service },
            { label: "Budget", value: contact.budget },
            { label: "Received", value: formatDateTime(contact.createdAt) },
            { label: "Updated", value: contact.updatedAt ? formatDateTime(contact.updatedAt) : "" },
            { label: "Page", value: contact.page, mono: true },
            {
              label: "Referrer",
              value: contact.referrer ? (
                <span title={contact.referrer}>
                  {referrerLabel(contact.referrer)}
                  {referrerLabel(contact.referrer) !== contact.referrer ? (
                    <span className="block font-mono text-[0.75rem] text-muted">{contact.referrer}</span>
                  ) : null}
                </span>
              ) : (
                ""
              ),
              wide: true,
            },
            { label: "Language", value: contact.language },
            { label: "Time zone", value: contact.timeZone },
          ]}
        />
      </Block>

      <ContactNote key={contact.id} contact={contact} />

      <ContactJourney contact={contact} />

      <details className="group min-w-0 rounded-sharp border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-[0.8125rem] font-medium text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
          Technical details
          <AdminIcon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line p-3">
          <KeyValue
            columns={1}
            items={[
              {
                label: "Visitor id",
                value: contact.visitorId ? (
                  <span className="inline-flex max-w-full items-center gap-1">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{contact.visitorId}</span>
                    <CopyButton value={contact.visitorId} label="Copy visitor id" />
                  </span>
                ) : (
                  "None (tracking off)"
                ),
                mono: true,
              },
              { label: "Record id", value: contact.id, mono: true },
              { label: "User agent", value: contact.userAgent, mono: true },
            ]}
          />
        </div>
      </details>
    </div>
  );
}

function StatusFooter({ contact }: { contact: ContactDoc }) {
  const { busyIds } = useAdminData();
  const { changeStatus } = useContactActions();
  const status = contactStatusOf(contact);
  const busy = busyIds.has(contact.id);
  return (
    <div className="flex min-w-0 items-center gap-3" aria-busy={busy || undefined}>
      <span className="hidden shrink-0 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted min-[400px]:inline">Status</span>
      <Segmented<ContactStatus>
        block
        ariaLabel="Change status"
        value={status}
        onChange={(next) => {
          if (!busy) void changeStatus(contact.id, next);
        }}
        options={CONTACT_STATUSES.map((s) => ({ value: s, label: CONTACT_STATUS_META[s].label, title: CONTACT_STATUS_META[s].description }))}
      />
    </div>
  );
}

export default function ContactDetail({
  contactId,
  onClose,
  order,
}: {
  contactId: string | null;
  onClose: () => void;
  /** Ids in list order, for previous / next. */
  order?: readonly string[];
}) {
  const { contacts, inboxError } = useAdminData();
  const found = contactId ? (contacts.find((c) => c.id === contactId) ?? null) : null;
  const lookup = useMissingCheck(contactId, Boolean(found));

  // Keep the last contact while the drawer animates out.
  const [kept, setKept] = useState<ContactDoc | null>(found);
  if (found && found !== kept) setKept(found);
  const contact = found ?? (contactId ? null : kept);

  const index = contactId && order ? order.indexOf(contactId) : -1;
  const prevId = index > 0 ? order?.[index - 1] : undefined;
  const nextId = index >= 0 && order && index < order.length - 1 ? order[index + 1] : undefined;

  // j / k (or arrow keys with Alt) step through the list on desktop.
  useEffect(() => {
    if (!contactId) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey)) return;
      if (event.key === "j" && nextId) navigate(routes.contacts(nextId), { replace: true });
      if (event.key === "k" && prevId) navigate(routes.contacts(prevId), { replace: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [contactId, prevId, nextId]);

  const open = Boolean(contactId);
  const subtitle = contact ? [contact.company, formatDateTime(contact.createdAt)].filter(Boolean).join(" · ") : undefined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      backLabel="Contacts"
      title={contact ? contact.name || "(no name)" : lookup.state === "missing" ? "Contact not found" : lookup.state === "error" ? "Could not load the contact" : "Loading…"}
      subtitle={subtitle}
      headerActions={
        order && index >= 0 && order.length > 1 ? (
          <>
            <IconButton
              icon="chevronUp"
              label="Previous contact (k)"
              disabled={!prevId}
              onClick={() => prevId && navigate(routes.contacts(prevId), { replace: true })}
            />
            <IconButton
              icon="chevronDown"
              label="Next contact (j)"
              disabled={!nextId}
              onClick={() => nextId && navigate(routes.contacts(nextId), { replace: true })}
            />
          </>
        ) : null
      }
      footer={contact ? <StatusFooter contact={contact} /> : undefined}
    >
      {contact ? (
        <DetailBody key={contact.id} contact={contact} />
      ) : lookup.state === "error" ? (
        <EmptyState
          icon="wifiOff"
          title="Could not load this contact"
          description={inboxError ?? "Check the connection, then try again."}
          action={
            <Button size="sm" icon="refresh" onClick={lookup.retry}>
              Try again
            </Button>
          }
        />
      ) : lookup.state !== "missing" ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="This contact is not in the loaded list"
          description="It may have been deleted, or it is older than the newest 1,000 submissions."
          action={
            <Button size="sm" icon="chevronLeft" onClick={onClose}>
              Back to contacts
            </Button>
          }
        />
      )}
    </Drawer>
  );
}
