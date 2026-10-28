/** Joins class names, skipping falsy values: cx("a", busy && "opacity-60", undefined) -> "a opacity-60". */
export function cx(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Shared surface classes so every card, panel and popover reads as one system. */
export const surface = {
  /** Raised card: chart, table, group of controls. */
  card: "rounded-[var(--radius-card)] border border-line bg-surface",
  /** Inset well inside a card (message bodies, code, notes). */
  well: "rounded-sharp border border-line bg-canvas/60",
  /** Floating layer: popovers, toasts, tooltips. */
  float: "rounded-sharp border border-line-strong bg-surface-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]",
} as const;

/** Visible focus ring for custom controls (matches the site-wide :focus-visible outline). */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus:outline-none";

/** Small uppercase label above a value (Geist Mono). */
export const eyebrow = "font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted";
