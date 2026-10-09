"use client";

import { useMemo, useState } from "react";
import type { ContactStatus } from "@/lib/firebase/schema";
import type { ContactDoc } from "@/lib/analytics/report";
import { formatDateTime } from "@/lib/analytics/report";
import { AdminButton } from "@/components/admin/ui";

type Filter = "all" | ContactStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "new", label: "New" },
  { key: "handled", label: "Handled" },
  { key: "spam", label: "Spam" },
  { key: "all", label: "All" },
];

const STATUS_STYLE: Record<ContactStatus, string> = {
  new: "border-accent text-accent",
  handled: "border-line text-muted",
  spam: "border-[#B42318] text-[#B42318]",
};

function replyHref(contact: ContactDoc): string {
  const email = (contact.email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "";
  const subject = encodeURIComponent("Re: your enquiry to BrightonSolution");
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${subject}`;
}

export default function ContactsPanel({
  contacts,
  onStatus,
  busyId,
}: {
  contacts: ContactDoc[];
  onStatus: (id: string, status: ContactStatus) => void;
  busyId: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: contacts.length, new: 0, handled: 0, spam: 0 };
    for (const contact of contacts) {
      const status = (contact.status ?? "new") as ContactStatus;
      if (status in result) result[status] += 1;
    }
    return result;
  }, [contacts]);

  const visible = useMemo(
    () => (filter === "all" ? contacts : contacts.filter((contact) => (contact.status ?? "new") === filter)),
    [contacts, filter],
  );

  return (
    <div className="min-w-0">
      <div role="group" aria-label="Filter submissions by status" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-sharp border px-3 text-[0.8125rem] transition-colors ${
              filter === item.key ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
            }`}
          >
            {item.label}
            <span className="font-mono tabular-nums opacity-70">{counts[item.key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="border-y border-line py-4 text-[0.875rem] text-muted">No submissions here.</p>
      ) : (
        <ol className="border-t border-ink">
          {visible.map((contact) => {
            const status = (contact.status ?? "new") as ContactStatus;
            const reply = replyHref(contact);
            const busy = busyId === contact.id;
            const details: [string, string | undefined][] = [
              ["Company", contact.company],
              ["Phone", contact.phone],
              ["Service", contact.service],
              ["Budget", contact.budget],
              ["Page", contact.page],
              ["Referrer", contact.referrer],
              ["Language", contact.language],
              ["Time zone", contact.timeZone],
            ];
            return (
              <li key={contact.id} className="border-b border-line py-5">
                <article aria-label={`Submission from ${contact.name || "unknown"}`} className="grid gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8">
                  <div className="min-w-0 space-y-2">
                    <p className="font-mono text-[0.75rem] tabular-nums text-muted">{formatDateTime(contact.createdAt)}</p>
                    <span
                      className={`eyebrow inline-flex items-center rounded-sharp border px-2 py-1 ${STATUS_STYLE[status] ?? STATUS_STYLE.new}`}
                    >
                      {status}
                    </span>
                    {contact.updatedAt ? (
                      <p className="text-[0.75rem] text-muted">Updated {formatDateTime(contact.updatedAt)}</p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-medium break-words">{contact.name || "(no name)"}</p>
                    {reply ? (
                      <a
                        href={reply}
                        className="inline-flex min-h-[44px] items-center break-all text-[0.875rem] text-accent underline-offset-4 hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <p className="text-[0.875rem] break-all text-muted">{contact.email}</p>
                    )}

                    <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-2">
                      {details
                        .filter(([, value]) => Boolean(value && value.trim()))
                        .map(([label, value]) => (
                          <div key={label} className="flex min-w-0 gap-2">
                            <dt className="shrink-0 text-muted">{label}</dt>
                            <dd className="min-w-0 break-words">{value}</dd>
                          </div>
                        ))}
                    </dl>

                    <details className="mt-3">
                      <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-[0.8125rem] text-ink underline-offset-4 hover:underline">
                        Message ({(contact.message ?? "").length} characters)
                      </summary>
                      <p className="mt-1 max-w-[70ch] whitespace-pre-wrap break-words border-l border-line pl-4 text-[0.875rem] leading-relaxed">
                        {contact.message}
                      </p>
                    </details>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {status !== "handled" ? (
                        <AdminButton disabled={busy} onClick={() => onStatus(contact.id, "handled")}>
                          Mark handled
                        </AdminButton>
                      ) : null}
                      {status !== "spam" ? (
                        <AdminButton disabled={busy} onClick={() => onStatus(contact.id, "spam")}>
                          Mark spam
                        </AdminButton>
                      ) : null}
                      {status !== "new" ? (
                        <AdminButton disabled={busy} onClick={() => onStatus(contact.id, "new")}>
                          Mark new
                        </AdminButton>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
