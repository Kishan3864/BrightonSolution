"use client";

import type { LeadStatus } from "@/lib/firebase/schema";
import { AdminIcon, TONE_CLASS, TONE_DOT, cx } from "../../kit";
import { LEAD_STATUS_META, LEAD_STATUSES } from "../../data/records";

/**
 * Status controls for leads. LeadStatusSelect: a compact native select tinted with the status hue,
 * for table rows (as in the old LeadsPanel). LeadStatusPicker: a labelled radio group of the five
 * statuses with their meaning, for the detail panel (large touch targets on phones).
 */

export function LeadStatusSelect({
  value,
  onChange,
  disabled,
  label,
  className,
}: {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
  /** Accessible name, e.g. "Status of Priya Shah". */
  label: string;
  className?: string;
}) {
  const meta = LEAD_STATUS_META[value];
  return (
    <span className={cx("relative inline-flex", className)}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as LeadStatus)}
        className={cx(
          "min-h-8 appearance-none rounded-full border py-1 pl-3 pr-7 text-[1rem] font-medium pointer-fine:text-[0.75rem] [color-scheme:dark] transition-opacity focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-progress disabled:opacity-60 pointer-coarse:min-h-11",
          TONE_CLASS[meta.tone],
        )}
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status} className="bg-surface text-fg">
            {LEAD_STATUS_META[status].label}
          </option>
        ))}
      </select>
      <AdminIcon name="chevronDown" size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-80" />
    </span>
  );
}

export function LeadStatusPicker({
  value,
  onChange,
  busy,
  name,
}: {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  busy?: boolean;
  /** Radio group name (unique per lead). */
  name: string;
}) {
  return (
    <fieldset className="min-w-0" disabled={busy} aria-busy={busy || undefined}>
      <legend className="sr-only">Status</legend>
      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
        {LEAD_STATUSES.map((status) => {
          const meta = LEAD_STATUS_META[status];
          const active = status === value;
          return (
            <label
              key={status}
              className={cx(
                "relative flex min-h-11 min-w-0 cursor-pointer items-start gap-2 rounded-sharp border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                active ? TONE_CLASS[meta.tone] : "border-line bg-canvas/40 text-fg hover:border-line-strong",
                busy && "cursor-progress opacity-70",
              )}
            >
              <input
                type="radio"
                name={name}
                value={status}
                checked={active}
                onChange={() => onChange(status)}
                className="sr-only"
              />
              <span aria-hidden="true" className="mt-[0.4rem] size-2 shrink-0 rounded-full" style={{ backgroundColor: TONE_DOT[meta.tone] }} />
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-medium leading-snug">{meta.label}</span>
                <span className={cx("block text-[0.6875rem] leading-snug", active ? "opacity-80" : "text-muted")}>{meta.description}</span>
              </span>
              {active ? <AdminIcon name="check" size={14} className="ml-auto mt-0.5 shrink-0" /> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
