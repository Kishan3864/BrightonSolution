"use client";

import { useId, useState } from "react";
import type { Bucket } from "@/lib/analytics/report";
import { formatNumber } from "@/lib/analytics/report";

/**
 * Page views over time: single-series bar chart (accent bars with a 2px surface gap, hairline
 * baseline and one recessive gridline at the scale maximum). Hover/focus a bar for its value;
 * the same numbers are available as a table.
 */
export default function ViewsChart({ buckets, unit }: { buckets: Bucket[]; unit: "hour" | "day" }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const total = buckets.reduce((sum, b) => sum + b.views, 0);
  const peak = buckets.reduce<Bucket | null>((best, b) => (!best || b.views > best.views ? b : best), null);
  const max = Math.max(1, niceMax(peak?.views ?? 0));
  const n = Math.max(1, buckets.length);
  const slot = 100 / n;
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const summary = `Page views per ${unit}: ${formatNumber(total)} in total${
    peak && peak.views > 0 ? `, peak ${formatNumber(peak.views)} on ${peak.longLabel}` : ""
  }.`;
  const shown = active !== null ? buckets[active] : null;

  return (
    <figure className="min-w-0">
      <div className="mb-3 flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[0.8125rem]">
        <span className="text-muted">{summary}</span>
        <span aria-live="polite" className="font-mono tabular-nums text-ink">
          {shown ? `${shown.longLabel} — ${formatNumber(shown.views)}` : ""}
        </span>
      </div>

      <div className="relative pl-10">
        {/* Scale: one recessive gridline at the maximum, hairline baseline at zero. */}
        <span className="absolute left-0 top-0 -translate-y-1/2 font-mono text-[0.6875rem] tabular-nums text-muted" aria-hidden="true">
          {formatNumber(max)}
        </span>
        <span className="absolute bottom-0 left-0 translate-y-1/2 font-mono text-[0.6875rem] tabular-nums text-muted" aria-hidden="true">
          0
        </span>
        <div className="relative h-[180px] border-b border-ink border-t border-t-line md:h-[220px]">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-labelledby={`${id}-title`}
          >
            <title id={`${id}-title`}>{summary}</title>
            {buckets.map((bucket, index) => {
              const height = (bucket.views / max) * 100;
              const x = index * slot;
              return (
                <g key={bucket.start.getTime()}>
                  {height > 0 ? (
                    <rect
                      x={x + slot * 0.12}
                      width={slot * 0.76}
                      y={100 - height}
                      height={height}
                      className={active === index ? "fill-ink" : "fill-accent"}
                      shapeRendering="crispEdges"
                    />
                  ) : null}
                  {/* Full-height hit target, larger than the mark. */}
                  <rect
                    x={x}
                    width={slot}
                    y={0}
                    height={100}
                    fill="transparent"
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive((current) => (current === index ? null : current))}
                  >
                    <title>{`${bucket.longLabel}: ${formatNumber(bucket.views)} page views`}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="relative mt-2 h-4" aria-hidden="true">
          {buckets.map((bucket, index) =>
            index % labelEvery === 0 ? (
              <span
                key={bucket.start.getTime()}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[0.6875rem] tabular-nums text-muted"
                style={{ left: `${(index + 0.5) * slot}%` }}
              >
                {bucket.label}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <details className="mt-6 text-[0.8125rem]">
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-ink underline-offset-4 hover:underline">
          Show as table
        </summary>
        <div className="mt-2 max-h-[320px] overflow-auto">
          <table className="w-full min-w-[16rem] border-collapse text-left">
            <caption className="sr-only">{summary}</caption>
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="eyebrow py-2 font-medium text-muted">
                  {unit === "hour" ? "Hour" : "Day"}
                </th>
                <th scope="col" className="eyebrow py-2 text-right font-medium text-muted">
                  Page views
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.start.getTime()} className="border-b border-line">
                  <td className="py-2">{bucket.longLabel}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{formatNumber(bucket.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}
