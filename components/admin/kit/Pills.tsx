import type { ReactNode } from "react";
import AdminIcon from "./AdminIcon";
import { cx } from "./cx";

/**
 * Small inline labels: StatusPill (state of a record, coloured by tone, always with a text label),
 * Badge (a count), SourceBadge (which form an enquiry came from) and Tag (neutral metadata chip).
 */

export type Tone = "accent" | "blue" | "green" | "muted" | "red" | "yellow" | "violet";

/** Pill styles per tone (border, wash, text). The hues match the old LeadsPanel STATUS_STYLE. */
export const TONE_CLASS: Record<Tone, string> = {
  accent: "border-accent/55 bg-accent/12 text-accent",
  blue: "border-[#7fb4ff]/45 bg-[#7fb4ff]/10 text-[#9cc5ff]",
  green: "border-[#6fd49a]/45 bg-[#6fd49a]/10 text-[#8fe2b1]",
  muted: "border-line-strong bg-fg/[0.04] text-muted",
  red: "border-[#ff8a7a]/55 bg-[#ff8a7a]/10 text-[#ff8a7a]",
  yellow: "border-accent-2/50 bg-accent-2/10 text-accent-2",
  violet: "border-[#b3a8ff]/45 bg-[#b3a8ff]/10 text-[#c4bcff]",
};

/** Solid dot colour per tone (for legends, timeline dots, stacked bars). */
export const TONE_DOT: Record<Tone, string> = {
  accent: "#ed943b",
  blue: "#7fb4ff",
  green: "#6fd49a",
  muted: "#6b6e78",
  red: "#ff8a7a",
  yellow: "#edb43b",
  violet: "#b3a8ff",
};

export function StatusPill({
  tone,
  children,
  dot = true,
  size = "md",
  className,
}: {
  tone: Tone;
  children: ReactNode;
  /** Leading dot in the tone colour. */
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-[0.75rem]",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE_DOT[tone] }} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Count bubble (nav items, tabs, chips). Renders nothing for 0 unless `showZero`. */
export function Badge({
  count,
  tone = "accent",
  max = 99,
  showZero = false,
  className,
  label,
}: {
  count: number;
  tone?: "accent" | "muted";
  max?: number;
  showZero?: boolean;
  className?: string;
  /** Screen-reader text, e.g. "3 new". Defaults to the number. */
  label?: string;
}) {
  if (!count && !showZero) return null;
  return (
    <span
      className={cx(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[0.6875rem] font-semibold tabular-nums leading-none",
        tone === "accent" ? "bg-accent text-canvas" : "bg-fg/10 text-muted",
        className,
      )}
    >
      <span aria-hidden={label ? true : undefined}>{count > max ? `${max}+` : count}</span>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export type EnquirySource = "contact" | "landing";

/** Which form an enquiry came from: website contact form or the private landing page. */
export function SourceBadge({ source, className }: { source: EnquirySource; className?: string }) {
  const contact = source === "contact";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[0.4rem] px-1.5 py-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.06em]",
        contact ? "bg-[#7fb4ff]/12 text-[#9cc5ff]" : "bg-accent/14 text-accent",
        className,
      )}
    >
      <AdminIcon name={contact ? "mail" : "rocket"} size={11} />
      {contact ? "Contact" : "Landing"}
    </span>
  );
}

/** Neutral metadata chip ("Plan request", "INR", "mobile"). */
export function Tag({ children, icon, className }: { children: ReactNode; icon?: Parameters<typeof AdminIcon>[0]["name"]; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-[0.4rem] border border-line bg-fg/[0.03] px-1.5 py-0.5 text-[0.75rem] text-muted",
        className,
      )}
    >
      {icon ? <AdminIcon name={icon} size={12} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
