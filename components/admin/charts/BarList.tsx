"use client";

import { useState, type ReactNode } from "react";
import { cx } from "../kit/cx";

/**
 * Ranked horizontal bars (top pages, sources, countries, browsers ...). Each row is the label over a
 * soft accent bar sized to its value, with the value and share on the right. Rows can link somewhere.
 * Shows `limit` rows with a "Show all" toggle. It is a real list, so it reads well without the bars.
 */

export type BarListRow = {
  key: string;
  label: ReactNode;
  value: number;
  /** 0..1 share shown beside the value (e.g. of all sessions). */
  share?: number;
  /** Small muted text after the label ("12 enquiries"). */
  sub?: ReactNode;
  /** Leading icon or flag. */
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Bar colour (default: accent wash). */
  color?: string;
};

export default function BarList({
  rows,
  format = (n: number) => n.toLocaleString(),
  limit = 8,
  labelHeader,
  valueHeader,
  empty = "No data in this range.",
  ariaLabel,
}: {
  rows: readonly BarListRow[];
  format?: (value: number) => string;
  /** Rows shown before "Show all". */
  limit?: number;
  /** Optional column captions above the list ("Source", "Sessions"). */
  labelHeader?: string;
  valueHeader?: string;
  empty?: ReactNode;
  ariaLabel: string;
}) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return <p className="py-6 text-center text-[0.8125rem] text-muted">{empty}</p>;
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  const shown = all ? rows : rows.slice(0, limit);

  return (
    <div className="min-w-0">
      {labelHeader || valueHeader ? (
        <div className="mb-1.5 flex justify-between px-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted" aria-hidden="true">
          <span>{labelHeader}</span>
          <span>{valueHeader}</span>
        </div>
      ) : null}
      <ol aria-label={ariaLabel} className="space-y-1">
        {shown.map((row) => {
          const pct = Math.max(0.5, (row.value / max) * 100);
          const inner = (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-[0.5rem] transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: row.color ?? "rgba(237,148,59,0.14)" }}
              />
              <span className="relative flex min-w-0 flex-1 items-center gap-2">
                {row.icon ? <span className="shrink-0">{row.icon}</span> : null}
                <span className="min-w-0 truncate text-fg">{row.label}</span>
                {row.sub ? <span className="hidden shrink-0 text-[0.75rem] text-muted sm:inline">{row.sub}</span> : null}
              </span>
              <span className="relative flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
                <span className="text-fg">{format(row.value)}</span>
                {row.share !== undefined ? (
                  <span className="w-11 text-right text-[0.75rem] text-muted">{(row.share * 100).toFixed(row.share < 0.1 ? 1 : 0)}%</span>
                ) : null}
              </span>
            </>
          );
          const cls = "relative flex min-h-9 w-full items-center justify-between gap-3 overflow-hidden rounded-[0.5rem] px-2 py-1.5 text-left text-[0.8125rem]";
          return (
            <li key={row.key}>
              {row.href ? (
                <a href={row.href} className={cx(cls, "hover:bg-fg/[0.04] focus:outline-none focus-visible:outline-2 focus-visible:outline-accent")}>
                  {inner}
                </a>
              ) : row.onClick ? (
                <button type="button" onClick={row.onClick} className={cx(cls, "hover:bg-fg/[0.04] focus:outline-none focus-visible:outline-2 focus-visible:outline-accent")}>
                  {inner}
                </button>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
      {rows.length > limit ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-2 inline-flex min-h-8 items-center rounded-[0.5rem] px-2 text-[0.8125rem] font-medium text-accent hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11"
        >
          {all ? "Show fewer" : `Show all ${rows.length.toLocaleString()}`}
        </button>
      ) : null}
    </div>
  );
}
