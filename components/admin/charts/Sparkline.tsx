"use client";

import { useId } from "react";
import { ACCENT, SURFACE, useWidth } from "./palette";

/**
 * Tiny trend line for KPI tiles and list rows: full container width, fixed height, soft area wash,
 * a dot on the latest value. Decorative unless `ariaLabel` is given (the tile states the numbers).
 */
export default function Sparkline({
  values,
  height = 32,
  color = ACCENT,
  area = true,
  ariaLabel,
}: {
  values: readonly number[];
  height?: number;
  color?: string;
  area?: boolean;
  ariaLabel?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrap, width] = useWidth<HTMLDivElement>();
  const n = values.length;
  const max = Math.max(1, ...values);
  const pad = 3;
  const x = (i: number) => (n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2));
  const y = (v: number) => pad + (height - pad * 2) * (1 - v / max);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const fill = n > 1 ? `${line}L${x(n - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z` : "";

  return (
    <div ref={wrap} className="w-full min-w-0" style={{ height }}>
      {width > 0 && n > 0 ? (
        <svg
          width={width}
          height={height}
          role={ariaLabel ? "img" : undefined}
          aria-label={ariaLabel}
          aria-hidden={ariaLabel ? undefined : true}
          className="block overflow-visible"
          style={{ width, height }}
        >
          <defs>
            <linearGradient id={`${uid}-g`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && fill ? <path d={fill} fill={`url(#${uid}-g)`} /> : null}
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(n - 1)} cy={y(values[n - 1] ?? 0)} r="3" fill={color} stroke={SURFACE} strokeWidth="2" />
        </svg>
      ) : null}
    </div>
  );
}
