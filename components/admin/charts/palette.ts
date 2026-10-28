"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Chart colours and shared chart helpers.
 *
 * - ACCENT: single-series charts use the brand orange (one series needs no categorical palette).
 * - SERIES: categorical palette for 2+ series, in this FIXED order (never cycled; fold extras into
 *   "Other"). Validated with the dataviz validator on the admin surface #13151b (dark): all eight
 *   adjacent pairs pass CVD (worst dE 8.4) and the normal-vision floor (worst dE 19.3), all >= 3:1
 *   contrast. For scatter-like "all pairs" use, only the first three are safe.
 * - PREVIOUS: the comparison period, drawn dashed in a neutral ink.
 * - Sequential scale (heatmap): the accent at rising opacity over the surface.
 * Text is never drawn in a series colour: labels use fg / muted, a colour swatch carries identity.
 */

export const ACCENT = "#ed943b";
export const ACCENT_2 = "#edb43b";
export const PREVIOUS = "#7d808a";
export const GRID = "rgba(243,240,234,0.08)";
export const AXIS = "rgba(243,240,234,0.18)";
export const SURFACE = "#13151b";
export const INK = "#f3f0ea";
export const MUTED = "#a2a5ae";

export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"] as const;

/** Colour of the n-th category (0-based); beyond 8 returns the neutral "Other" grey. */
export function seriesColor(index: number): string {
  return SERIES[index] ?? "#5c5f69";
}

/** Sequential fill for t in 0..1 (0 = empty cell). */
export function sequential(t: number): string {
  if (!(t > 0)) return "rgba(243,240,234,0.04)";
  const alpha = 0.14 + Math.min(1, t) * 0.86;
  return `rgba(237,148,59,${alpha.toFixed(3)})`;
}

/** Compact axis number: 950, 1.2K, 12K, 1.3M. */
export function compact(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(Math.round(value * 100) / 100);
}

/** "Nice" axis maximum and ticks (0 .. max in `count` steps of 1/2/2.5/5 x 10^n). */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Width of an element, tracked with ResizeObserver (0 until measured). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      setWidth((current) => (Math.abs(current - next) > 0.5 ? next : current));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
