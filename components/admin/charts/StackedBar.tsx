"use client";

import { useState } from "react";
import { cx } from "../kit/cx";

/**
 * One horizontal 100% bar split into segments: the status pipeline (new / contacted / won / lost /
 * spam) or any share breakdown. 2px gaps between segments, hover/focus readout, and a legend with
 * count + share that can act as filter buttons (onSelect). Identity never relies on colour alone.
 */

export type StackSegment = { key: string; label: string; value: number; color: string };

export default function StackedBar({
  segments,
  height = 12,
  format = (n: number) => n.toLocaleString(),
  ariaLabel,
  onSelect,
  selected,
  legend = true,
}: {
  segments: readonly StackSegment[];
  height?: number;
  format?: (value: number) => string;
  ariaLabel: string;
  /** Makes legend items buttons (e.g. filter the table by status). */
  onSelect?: (key: string) => void;
  /** Key of the selected segment (pressed legend item). */
  selected?: string | null;
  legend?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const focus = segments.find((s) => s.key === active);

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex h-4 items-center justify-between text-[0.75rem]" aria-hidden="true">
        <span className="text-muted">{focus ? focus.label : "Total"}</span>
        <span className="font-mono tabular-nums text-fg">
          {focus ? `${format(focus.value)} · ${total ? ((focus.value / total) * 100).toFixed(0) : 0}%` : format(total)}
        </span>
      </div>
      <div role="img" aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${format(s.value)}`).join(", ")}`} className="flex w-full gap-[2px] overflow-hidden rounded-full bg-fg/[0.05]" style={{ height }}>
        {visible.map((s) => (
          <span
            key={s.key}
            onPointerEnter={() => setActive(s.key)}
            onPointerLeave={() => setActive(null)}
            className={cx("h-full transition-opacity first:rounded-l-full last:rounded-r-full", active && active !== s.key && "opacity-40")}
            style={{ flexGrow: s.value, flexBasis: 0, backgroundColor: s.color, minWidth: 3 }}
          />
        ))}
      </div>
      {legend ? (
        <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
          {segments.map((s) => {
            const content = (
              <>
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-fg">{s.label}</span>
                <span className="font-mono tabular-nums text-muted">{format(s.value)}</span>
              </>
            );
            const cls = cx(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] pointer-coarse:min-h-10",
              selected === s.key ? "bg-fg/[0.1] ring-1 ring-line-strong" : "",
            );
            return (
              <li key={s.key} onPointerEnter={() => setActive(s.key)} onPointerLeave={() => setActive(null)}>
                {onSelect ? (
                  <button
                    type="button"
                    aria-pressed={selected === s.key}
                    onClick={() => onSelect(s.key)}
                    onFocus={() => setActive(s.key)}
                    onBlur={() => setActive(null)}
                    className={cx(cls, "hover:bg-fg/[0.06] focus:outline-none focus-visible:outline-2 focus-visible:outline-accent")}
                  >
                    {content}
                  </button>
                ) : (
                  <span className={cls}>{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
