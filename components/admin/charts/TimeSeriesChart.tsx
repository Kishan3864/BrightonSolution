"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import ChartTooltip from "./ChartTooltip";
import { ACCENT, AXIS, compact, GRID, MUTED, niceTicks, PREVIOUS, SURFACE, useWidth } from "./palette";

/**
 * Responsive line / area chart over time with an optional dashed previous-period series.
 * Hover (or arrow keys when focused) moves a crosshair that snaps to the nearest point; one tooltip
 * lists every series there. role="img" with an aria-label, plus a visually hidden data table.
 */

export type TimePoint = {
  key: string;
  /** Short axis label ("Mon 12", "14:00"). */
  label: string;
  /** Tooltip title ("Monday 12 October 2026"). */
  longLabel?: string;
  /** Bucket only partly inside the range (shown with a hollow marker). */
  partial?: boolean;
  values: Record<string, number | null | undefined>;
};

export type TimeSeries = {
  key: string;
  label: string;
  color?: string;
  /** Dashed line (use for the previous period). */
  dashed?: boolean;
  /** Fill a ~10% wash under the line. */
  area?: boolean;
};

const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

export default function TimeSeriesChart({
  points,
  series,
  height = 240,
  format = (n: number) => n.toLocaleString(),
  ariaLabel,
  showLegend,
}: {
  points: readonly TimePoint[];
  series: readonly TimeSeries[];
  height?: number;
  /** Value formatter for the tooltip and the hidden table. */
  format?: (value: number) => string;
  ariaLabel: string;
  /** Legend row above the plot (default: when there are 2+ series). */
  showLegend?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const max = useMemo(() => {
    let m = 0;
    for (const p of points) for (const s of series) m = Math.max(m, p.values[s.key] ?? 0);
    return m;
  }, [points, series]);

  const ticks = niceTicks(max, height < 180 ? 3 : 4);
  const top = ticks[ticks.length - 1] || 1;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const n = points.length;
  const xAt = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const colorOf = (s: TimeSeries, i: number) => s.color ?? (s.dashed ? PREVIOUS : i === 0 ? ACCENT : PREVIOUS);
  const legend = showLegend ?? series.length > 1;

  const paths = series.map((s, si) => {
    let line = "";
    let area = "";
    let started = false;
    let firstX = 0;
    let lastX = 0;
    points.forEach((p, i) => {
      const v = p.values[s.key];
      if (v === null || v === undefined) {
        started = false;
        return;
      }
      const x = xAt(i);
      const y = yAt(v);
      line += `${started ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      if (!started && !area) firstX = x;
      area += `${area ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      lastX = x;
      started = true;
    });
    const base = yAt(0).toFixed(1);
    const areaPath = area ? `${area}L${lastX.toFixed(1)},${base}L${firstX.toFixed(1)},${base}Z` : "";
    return { s, color: colorOf(s, si), line, areaPath };
  });

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))));
  // X labels: every labelEvery-th point plus the last one, dropping any whose estimated text box
  // would touch a label already kept (the last one wins, so the axis always ends on the newest bucket).
  const shownLabels = new Set<number>();
  if (n > 0) {
    const span = (i: number): [number, number] => {
      const w = points[i].label.length * 6 + 8;
      const x = xAt(i);
      if (i === 0 && n > 1) return [x, x + w];
      if (i === n - 1 && n > 1) return [x - w, x];
      return [x - w / 2, x + w / 2];
    };
    const lastSpan = span(n - 1);
    let rightEdge = -Infinity;
    for (let i = 0; i < n - 1; i += labelEvery) {
      const [l, r] = span(i);
      if (l < rightEdge || r > lastSpan[0]) continue;
      shownLabels.add(i);
      rightEdge = r;
    }
    shownLabels.add(n - 1);
  }

  function onMove(event: PointerEvent<SVGSVGElement>) {
    if (n === 0 || innerW <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - PAD.left;
    const i = Math.round((x / innerW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (n === 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((i) => {
        const cur = i ?? (event.key === "ArrowRight" ? -1 : n);
        return Math.max(0, Math.min(n - 1, cur + (event.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (event.key === "Escape") setActive(null);
  }

  const hovered = active !== null ? points[active] : null;

  return (
    <div className="min-w-0">
      {legend ? (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-muted" aria-hidden="true">
          {paths.map(({ s, color }) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <svg width="14" height="4" style={{ width: 14, height: 4 }}>
                <line x1="0" x2="14" y1="2" y2="2" stroke={color} strokeWidth="2" strokeDasharray={s.dashed ? "3 2" : undefined} />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={wrap} className="relative w-full min-w-0" style={{ height }}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            className="block touch-pan-y overflow-visible rounded-[0.5rem] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            style={{ width, height }}
          >
            <defs>
              {paths.map(({ s, color }) =>
                s.area ? (
                  <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                  </linearGradient>
                ) : null,
              )}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={yAt(t)} y2={yAt(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth="1" />
                <text x={PAD.left - 8} y={yAt(t)} dy="0.32em" textAnchor="end" fontSize="10.5" fill={MUTED} className="font-mono tabular-nums">
                  {compact(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              if (!shownLabels.has(i)) return null;
              return (
                <text
                  key={p.key}
                  x={xAt(i)}
                  y={height - 8}
                  textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
                  fontSize="10.5"
                  fill={MUTED}
                >
                  {p.label}
                </text>
              );
            })}
            {paths.map(({ s, areaPath }) => (s.area && areaPath ? <path key={`a-${s.key}`} d={areaPath} fill={`url(#${uid}-${s.key})`} /> : null))}
            {[...paths].reverse().map(({ s, color, line }) => (
              <path
                key={`l-${s.key}`}
                d={line}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "4 4" : undefined}
              />
            ))}
            {/* End marker of the main series, hollow when the last bucket is partial. */}
            {n > 0 && paths[0] && points[n - 1].values[paths[0].s.key] != null ? (
              <circle
                cx={xAt(n - 1)}
                cy={yAt(points[n - 1].values[paths[0].s.key] ?? 0)}
                r="4"
                fill={points[n - 1].partial ? SURFACE : paths[0].color}
                stroke={points[n - 1].partial ? paths[0].color : SURFACE}
                strokeWidth="2"
              />
            ) : null}
            {hovered && active !== null ? (
              <g>
                <line x1={xAt(active)} x2={xAt(active)} y1={PAD.top} y2={PAD.top + innerH} stroke={AXIS} strokeWidth="1" />
                {paths.map(({ s, color }) => {
                  const v = hovered.values[s.key];
                  return v === null || v === undefined ? null : (
                    <circle key={s.key} cx={xAt(active)} cy={yAt(v)} r="4.5" fill={s.dashed ? SURFACE : color} stroke={s.dashed ? color : SURFACE} strokeWidth="2" />
                  );
                })}
              </g>
            ) : null}
          </svg>
        ) : null}
        {hovered && active !== null ? (
          <ChartTooltip
            x={xAt(active)}
            y={PAD.top}
            width={width}
            title={`${hovered.longLabel ?? hovered.label}${hovered.partial ? " (partial)" : ""}`}
            rows={paths.map(({ s, color }) => {
              const v = hovered.values[s.key];
              return { label: s.label, value: v === null || v === undefined ? "-" : format(v), color, dashed: s.dashed };
            })}
          />
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.longLabel ?? p.label}</th>
              {series.map((s) => {
                const v = p.values[s.key];
                return <td key={s.key}>{v === null || v === undefined ? "-" : format(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
