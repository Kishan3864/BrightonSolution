"use client";

import type { ReactNode } from "react";
import { AdminIcon, cx, type AdminIconName } from "../../kit";

/**
 * Small building blocks used only by the Settings view: Switch (an accessible on/off toggle with a
 * 44px touch target), SettingRow (label + description on the left, control on the right, stacking on
 * narrow cards) and StepList (numbered how-to steps).
 */

export function Switch({
  checked,
  onChange,
  label,
  describedBy,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name (the visible row title usually labels it through `id` + htmlFor instead). */
  label: string;
  describedBy?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        // The visible track is 44x26; the button itself is a 44px-tall touch target.
        "group relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-45",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative inline-block h-[26px] w-11 rounded-full border transition-colors duration-150 motion-reduce:transition-none",
          checked ? "border-accent bg-accent" : "border-line-strong bg-fg/[0.08] group-hover:border-fg/40",
        )}
      >
        <span
          className={cx(
            "absolute top-[2px] size-5 rounded-full shadow-sm transition-[left,background-color] duration-150 motion-reduce:transition-none",
            checked ? "left-[20px] bg-canvas" : "left-[2px] bg-fg/80",
          )}
        />
      </span>
    </button>
  );
}

/** One setting: title + description on the left, control on the right (below it when the card is narrow). */
export function SettingRow({
  title,
  description,
  control,
  titleId,
  descriptionId,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  titleId?: string;
  descriptionId?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 items-start justify-between gap-4", className)}>
      <div className="min-w-0 flex-1">
        <p id={titleId} className="text-[0.875rem] font-medium leading-snug text-fg">
          {title}
        </p>
        {description ? (
          <div id={descriptionId} className="mt-1 text-[0.8125rem] leading-relaxed text-muted text-pretty [&_strong]:font-medium [&_strong]:text-fg">
            {description}
          </div>
        ) : null}
      </div>
      <div className="-my-1.5 shrink-0">{control}</div>
    </div>
  );
}

/** Divider between rows inside a card. */
export function RowDivider() {
  return <hr className="my-4 border-0 border-t border-line" />;
}

/** "What happens" list with an icon per line. */
export function IconList({ items }: { items: readonly { icon: AdminIconName; text: ReactNode; tone?: "accent" | "green" | "muted" }[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex min-w-0 gap-2.5 text-[0.8125rem] leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-fg">
          <AdminIcon
            name={item.icon}
            size={16}
            className={cx(
              "mt-[3px] shrink-0",
              item.tone === "green" ? "text-[#8fe2b1]" : item.tone === "accent" ? "text-accent" : "text-muted",
            )}
          />
          <span className="min-w-0">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps (install instructions). */
export function StepList({ steps }: { steps: readonly ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex min-w-0 gap-2.5 text-[0.8125rem] leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-fg">
          <span
            aria-hidden="true"
            className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[0.6875rem] tabular-nums text-fg"
          >
            {i + 1}
          </span>
          <span className="min-w-0">{step}</span>
        </li>
      ))}
    </ol>
  );
}
