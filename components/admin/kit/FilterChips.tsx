"use client";

import { cx } from "./cx";
import { TONE_DOT, type Tone } from "./Pills";

/**
 * A row of single-select filter chips with counts ("All 120 · New 8 · Contacted 30 ...").
 * Scrolls sideways on phones instead of wrapping into many lines. The pressed chip is filled.
 */

export type ChipOption<V extends string> = { value: V; label: string; count?: number; tone?: Tone };

export default function FilterChips<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  wrap = false,
}: {
  options: readonly ChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  className?: string;
  /** Wrap onto several lines instead of scrolling sideways. */
  wrap?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        "flex min-w-0 gap-1.5",
        wrap ? "flex-wrap" : "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[0.8125rem] font-medium transition-colors pointer-coarse:min-h-10 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active ? "border-fg bg-fg text-canvas" : "border-line-strong text-muted hover:border-fg/45 hover:text-fg",
            )}
          >
            {option.tone ? <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: TONE_DOT[option.tone] }} /> : null}
            {option.label}
            {typeof option.count === "number" ? (
              <span className={cx("font-mono text-[0.75rem] tabular-nums", active ? "text-canvas/70" : "text-muted/80")}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
