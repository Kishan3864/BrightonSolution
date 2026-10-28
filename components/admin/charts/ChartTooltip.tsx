import type { ReactNode } from "react";

/**
 * Hover readout shared by the charts: positioned inside the chart's relative wrapper, flipped to
 * stay inside it. Values lead (bold), series names follow; rows are keyed by a short line or square.
 */

export type TooltipRow = { label: string; value: string; color?: string; dashed?: boolean; square?: boolean };

export default function ChartTooltip({
  x,
  y,
  width,
  title,
  rows,
  footer,
}: {
  /** Anchor in px inside the wrapper. */
  x: number;
  y: number;
  /** Wrapper width, to flip near the right edge. */
  width: number;
  title: ReactNode;
  rows: readonly TooltipRow[];
  footer?: ReactNode;
}) {
  const flip = x > width * 0.6;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 min-w-[9rem] max-w-[15rem] rounded-sharp border border-line-strong bg-surface-2/95 px-3 py-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm"
      style={{ left: flip ? undefined : x + 12, right: flip ? width - x + 12 : undefined, top: Math.max(0, y) }}
    >
      <p className="mb-1 text-[0.6875rem] font-medium text-muted">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-[0.75rem]">
            {row.color ? (
              row.square ? (
                <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: row.color }} />
              ) : (
                <svg aria-hidden="true" width="12" height="4" className="shrink-0" style={{ width: 12, height: 4 }}>
                  <line x1="0" x2="12" y1="2" y2="2" stroke={row.color} strokeWidth="2" strokeDasharray={row.dashed ? "3 2" : undefined} />
                </svg>
              )
            ) : null}
            <span className="font-mono font-semibold tabular-nums text-fg">{row.value}</span>
            <span className="min-w-0 truncate text-muted">{row.label}</span>
          </li>
        ))}
      </ul>
      {footer ? <div className="mt-1 text-[0.6875rem] text-muted">{footer}</div> : null}
    </div>
  );
}
