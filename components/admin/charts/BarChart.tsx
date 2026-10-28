"use client";

import { useState } from "react";
import ChartTooltip from "./ChartTooltip";
import { ACCENT, AXIS, compact, GRID, MUTED, niceTicks, useWidth } from "./palette";

/**
 * Vertical bars for buckets (hours of the day, weekdays, scroll depth, load-time bands). Bars are at
 * most 24px thick with a 4px rounded top on a shared baseline; each bar (with its full column as hit
 * area) shows a tooltip on hover and keyboard focus. Hidden data table for screen readers.
 */

export type BarDatum = { key: string; label: string; longLabel?: string; value: number; /** Draw in the accent (others recede). */ highlight?: boolean };

const PAD = { top: 10, right: 4, bottom: 24, left: 34 };

export default function BarChart({
  data,
  height = 200,
  format = (n: number) => n.toLocaleString(),
  ariaLabel,
  color = ACCENT,
  valueLabel = "Value",
}: {
  data: readonly BarDatum[];
  height?: number;
  format?: (value: number) => string;
  ariaLabel: string;
  color?: string;
  /** Name of the measure in the tooltip ("Page views"). */
  valueLabel?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1] || 1;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const n = data.length;
  const band = n ? innerW / n : 0;
  const barW = Math.max(2, Math.min(24, band - 2));
  const yAt = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const anyHighlight = data.some((d) => d.highlight);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 36))));

  return (
    <div className="min-w-0">
      <div ref={wrap} className="relative w-full min-w-0" style={{ height }}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            // One tab stop for the whole chart: arrows (Home/End) move between bars.
            tabIndex={0}
            onFocus={() => setActive((i) => i ?? (n ? 0 : null))}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (!n) return;
              const keys: Record<string, (i: number) => number> = {
                ArrowRight: (i) => Math.min(n - 1, i + 1),
                ArrowLeft: (i) => Math.max(0, i - 1),
                Home: () => 0,
                End: () => n - 1,
              };
              const move = keys[event.key];
              if (!move) return;
              event.preventDefault();
              setActive((i) => move(i ?? 0));
            }}
            className="block overflow-visible rounded-[0.5rem] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            style={{ width, height }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={yAt(t)} y2={yAt(t)} stroke={t === 0 ? AXIS : GRID} />
                <text x={PAD.left - 8} y={yAt(t)} dy="0.32em" textAnchor="end" fontSize="10.5" fill={MUTED} className="font-mono">
                  {compact(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = PAD.left + i * band + (band - barW) / 2;
              const h = Math.max(0, yAt(0) - yAt(d.value));
              const r = Math.min(4, h, barW / 2);
              const y = yAt(0) - h;
              const fill = anyHighlight && !d.highlight ? "rgba(237,148,59,0.38)" : color;
              const path =
                h > 0
                  ? `M${x},${yAt(0)}V${y + r}Q${x},${y} ${x + r},${y}H${x + barW - r}Q${x + barW},${y} ${x + barW},${y + r}V${yAt(0)}Z`
                  : "";
              return (
                <g key={d.key}>
                  {path ? <path d={path} fill={fill} opacity={active === null || active === i ? 1 : 0.55} /> : null}
                  <rect
                    x={PAD.left + i * band}
                    y={PAD.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    role="presentation"
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    className="cursor-default"
                  />
                  {i % labelEvery === 0 ? (
                    <text x={PAD.left + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize="10.5" fill={MUTED}>
                      {d.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {active !== null ? (
              <rect
                x={PAD.left + active * band + 1}
                y={PAD.top}
                width={Math.max(0, band - 2)}
                height={innerH}
                fill="rgba(243,240,234,0.04)"
                pointerEvents="none"
                rx="4"
              />
            ) : null}
          </svg>
        ) : null}
        {active !== null && data[active] ? (
          <ChartTooltip
            x={PAD.left + active * band + band / 2}
            y={Math.max(0, yAt(data[active].value) - 48)}
            width={width}
            title={data[active].longLabel ?? data[active].label}
            rows={[{ label: valueLabel, value: format(data[active].value), color, square: true }]}
          />
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.longLabel ?? d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
