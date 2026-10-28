"use client";

import { useState } from "react";
import ChartTooltip from "./ChartTooltip";
import { sequential, useWidth } from "./palette";

/**
 * Weekday x hour heatmap (report.heatmap: 7 rows Mon..Sun, 24 hour columns). One-hue sequential
 * scale (accent, light to strong); empty cells stay faint. Cells shrink to fit 320px phones; every
 * cell has a hover tooltip, the chart is one tab stop whose arrow keys (Home/End) move the active
 * cell, and the hidden table lists all values.
 */
export default function Heatmap({
  rows,
  cells,
  max,
  format = (n: number) => n.toLocaleString(),
  valueLabel = "Page views",
  ariaLabel,
}: {
  /** Row labels, e.g. WEEKDAYS. */
  rows: readonly string[];
  /** cells[row][hour] */
  cells: readonly (readonly number[])[];
  max: number;
  format?: (value: number) => string;
  valueLabel?: string;
  ariaLabel: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const labelW = 34;
  const cols = cells[0]?.length ?? 24;
  const gap = width < 480 ? 1.5 : 2;
  const cell = width > 0 ? Math.max(6, (width - labelW - gap * (cols - 1)) / cols) : 0;
  const cellH = Math.min(26, Math.max(14, cell));
  const height = rows.length * (cellH + gap) + 20;
  const hourLabels = width < 420 ? [0, 6, 12, 18] : [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="min-w-0">
      <div ref={wrap} className="relative w-full min-w-0" style={{ height: height || 200 }}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onFocus={() => setActive((a) => a ?? (rows.length ? { r: 0, c: 0 } : null))}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              const last = { r: rows.length - 1, c: cols - 1 };
              if (last.r < 0) return;
              const moves: Record<string, (a: { r: number; c: number }) => { r: number; c: number }> = {
                ArrowRight: (a) => ({ r: a.r, c: Math.min(last.c, a.c + 1) }),
                ArrowLeft: (a) => ({ r: a.r, c: Math.max(0, a.c - 1) }),
                ArrowDown: (a) => ({ r: Math.min(last.r, a.r + 1), c: a.c }),
                ArrowUp: (a) => ({ r: Math.max(0, a.r - 1), c: a.c }),
                Home: (a) => ({ r: a.r, c: 0 }),
                End: (a) => ({ r: a.r, c: last.c }),
              };
              const move = moves[event.key];
              if (!move) return;
              event.preventDefault();
              setActive((a) => move(a ?? { r: 0, c: 0 }));
            }}
            className="block rounded-[0.5rem] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            style={{ width, height }}
          >
            {rows.map((label, r) => (
              <g key={label}>
                <text x={0} y={r * (cellH + gap) + cellH / 2} dy="0.32em" fontSize="10.5" fill="#a2a5ae">
                  {label}
                </text>
                {cells[r]?.map((value, c) => (
                  <rect
                    key={c}
                    x={labelW + c * (cell + gap)}
                    y={r * (cellH + gap)}
                    width={cell}
                    height={cellH}
                    rx={Math.min(4, cell / 3)}
                    fill={sequential(max ? value / max : 0)}
                    stroke={active?.r === r && active.c === c ? "#f3f0ea" : "none"}
                    strokeWidth="1.5"
                    onPointerEnter={() => setActive({ r, c })}
                    onPointerLeave={() => setActive(null)}
                  />
                ))}
              </g>
            ))}
            {hourLabels.map((h) => (
              <text key={h} x={labelW + h * (cell + gap)} y={height - 4} fontSize="10.5" fill="#a2a5ae" className="font-mono">
                {String(h).padStart(2, "0")}
              </text>
            ))}
          </svg>
        ) : null}
        {active ? (
          <ChartTooltip
            x={labelW + active.c * (cell + gap) + cell / 2}
            y={Math.max(0, active.r * (cellH + gap) - 56)}
            width={width}
            title={`${rows[active.r]} ${String(active.c).padStart(2, "0")}:00–${String((active.c + 1) % 24).padStart(2, "0")}:00`}
            rows={[{ label: valueLabel, value: format(cells[active.r]?.[active.c] ?? 0), color: sequential(1), square: true }]}
          />
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-[0.6875rem] text-muted" aria-hidden="true">
        <span>Fewer</span>
        {[0.05, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} className="size-3 rounded-[3px]" style={{ backgroundColor: sequential(t) }} />
        ))}
        <span>More</span>
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {Array.from({ length: cols }, (_, h) => (
              <th key={h} scope="col">{`${h}:00`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((label, r) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {cells[r]?.map((v, c) => <td key={c}>{format(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
