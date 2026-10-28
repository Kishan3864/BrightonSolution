"use client";

import { useState, type ReactNode } from "react";
import { cx } from "../kit/cx";
import { seriesColor } from "./palette";

/**
 * Donut for parts of a whole with few categories (devices, new vs returning, lead kinds). Slices take
 * the categorical palette in fixed order; more than `maxSlices` fold into "Other". A 2px surface gap
 * separates slices. Hovering a slice or its legend row shows it in the centre. The legend (value +
 * share) is always present, so colour never carries identity alone.
 */

export type DonutSlice = { key: string; label: string; value: number; color?: string };

export default function Donut({
  slices,
  size = 148,
  thickness = 18,
  format = (n: number) => n.toLocaleString(),
  centerLabel = "Total",
  centerValue,
  maxSlices = 6,
  ariaLabel,
  legend = "side",
}: {
  slices: readonly DonutSlice[];
  size?: number;
  thickness?: number;
  format?: (value: number) => string;
  centerLabel?: string;
  /** Overrides the total in the centre. */
  centerValue?: ReactNode;
  maxSlices?: number;
  ariaLabel: string;
  /** Legend beside the ring (stacks under it in narrow containers) or always below. */
  legend?: "side" | "below";
}) {
  const [active, setActive] = useState<string | null>(null);
  const sorted = slices.filter((s) => s.value > 0);
  const folded: DonutSlice[] =
    sorted.length > maxSlices
      ? [...sorted.slice(0, maxSlices - 1), { key: "__other", label: "Other", value: sorted.slice(maxSlices - 1).reduce((s, x) => s + x.value, 0), color: "#5c5f69" }]
      : sorted;
  const total = folded.reduce((sum, s) => sum + s.value, 0);
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  const gap = folded.length > 1 ? 2 : 0;
  let offset = 0;
  const arcs = folded.map((slice, i) => {
    const len = total ? (slice.value / total) * c : 0;
    const arc = { slice, color: slice.color ?? seriesColor(i), dash: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });
  const focus = arcs.find((a) => a.slice.key === active);

  return (
    <div className={cx("@container min-w-0")}>
      <div className={cx("flex min-w-0 flex-col items-center gap-4", legend === "side" && "@sm:flex-row @sm:items-center @sm:gap-6")}>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel} className="-rotate-90" style={{ width: size, height: size }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(243,240,234,0.06)" strokeWidth={thickness} />
            {arcs.map((a) => (
              <circle
                key={a.slice.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={active === a.slice.key ? thickness + 4 : thickness}
                strokeDasharray={`${a.dash} ${c - a.dash}`}
                strokeDashoffset={-a.offset}
                opacity={active && active !== a.slice.key ? 0.35 : 1}
                onPointerEnter={() => setActive(a.slice.key)}
                onPointerLeave={() => setActive(null)}
                className="transition-[opacity,stroke-width] duration-150"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="max-w-[70%] truncate text-[0.6875rem] text-muted">{focus ? focus.slice.label : centerLabel}</span>
            <span className="font-mono text-[1.125rem] font-medium tabular-nums text-fg">
              {focus ? format(focus.slice.value) : (centerValue ?? format(total))}
            </span>
            {focus && total ? <span className="font-mono text-[0.6875rem] text-muted">{((focus.slice.value / total) * 100).toFixed(1)}%</span> : null}
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-1">
          {arcs.map((a) => (
            <li key={a.slice.key}>
              <div
                onPointerEnter={() => setActive(a.slice.key)}
                onPointerLeave={() => setActive(null)}
                className={cx("flex min-h-8 items-center gap-2.5 rounded-[0.5rem] px-2 text-[0.8125rem]", active === a.slice.key && "bg-fg/[0.05]")}
              >
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: a.color }} />
                <span className="min-w-0 flex-1 truncate text-fg">{a.slice.label}</span>
                <span className="font-mono tabular-nums text-fg">{format(a.slice.value)}</span>
                <span className="w-12 text-right font-mono text-[0.75rem] tabular-nums text-muted">
                  {total ? `${((a.slice.value / total) * 100).toFixed(0)}%` : "-"}
                </span>
              </div>
            </li>
          ))}
          {arcs.length === 0 ? <li className="text-[0.8125rem] text-muted">No data in this range.</li> : null}
        </ul>
      </div>
    </div>
  );
}
