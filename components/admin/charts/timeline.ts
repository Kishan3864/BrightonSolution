import type { TimelineBucket } from "@/lib/analytics/report";
import type { TimePoint } from "./TimeSeriesChart";

export type TimelineMetric = "views" | "visitors" | "sessions" | "enquiries";

/**
 * report.timeline -> TimeSeriesChart points with `current` and (optionally) `previous` values.
 * The previous period's buckets are aligned by position (bucket 1 with bucket 1 ...), the usual
 * "same day last period" comparison. Usage:
 *   <TimeSeriesChart points={timelinePoints(report.timeline, "views", previousReport?.timeline)}
 *     series={[{ key: "current", label: "Page views", area: true }, { key: "previous", label: "Previous period", dashed: true }]} />
 */
export function timelinePoints(current: readonly TimelineBucket[], metric: TimelineMetric, previous?: readonly TimelineBucket[] | null): TimePoint[] {
  const offset = previous ? previous.length - current.length : 0;
  return current.map((bucket, i) => {
    const prev = previous ? previous[i + offset] : undefined;
    return {
      key: bucket.key,
      label: bucket.label,
      longLabel: bucket.longLabel,
      partial: bucket.partial,
      values: { current: bucket[metric], previous: prev ? prev[metric] : null },
    };
  });
}
