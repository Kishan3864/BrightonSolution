import type { ReactNode } from "react";
import { formatChange, type Kpi } from "@/lib/analytics/report";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { Skeleton } from "./Feedback";
import { InfoTip } from "./Tooltip";
import { cx, eyebrow, focusRing, surface } from "./cx";

/**
 * Stat tile: label, big value, change versus the previous period, optional sparkline and definition.
 * The change is coloured by whether the move is good (green) or bad (red), never by direction alone,
 * and always carries an arrow + signed text so colour is never the only cue.
 */

export type Delta = {
  /** Signed text, e.g. "+12%" or "-3.1 pts". */
  text: string;
  direction: "up" | "down" | "flat";
  /** true = good news, false = bad news, null = neutral. */
  good: boolean | null;
};

/** Delta for a report Kpi; `upIsGood` false for metrics like bounce rate and load time. */
export function kpiDelta(kpi: Pick<Kpi, "change" | "kind"> | null | undefined, upIsGood = true): Delta | null {
  if (!kpi || kpi.change === null || !Number.isFinite(kpi.change)) return null;
  const text = formatChange(kpi);
  if (!text) return null;
  const direction = kpi.change > 0.0005 ? "up" : kpi.change < -0.0005 ? "down" : "flat";
  return { text, direction, good: direction === "flat" ? null : (direction === "up") === upIsGood };
}

/** Delta between two plain numbers (relative change). */
export function numberDelta(current: number, previous: number | null | undefined, upIsGood = true): Delta | null {
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? { text: "0%", direction: "flat", good: null } : { text: "new", direction: "up", good: upIsGood };
  return kpiDelta({ change: (current - previous) / previous, kind: "count" }, upIsGood);
}

export function DeltaText({ delta, suffix, className }: { delta: Delta; suffix?: string; className?: string }) {
  const color = delta.good === null ? "text-muted" : delta.good ? "text-[#8fe2b1]" : "text-[#ff8a7a]";
  const icon: AdminIconName = delta.direction === "up" ? "arrowUp" : delta.direction === "down" ? "arrowDown" : "minus";
  return (
    <span className={cx("inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-[0.75rem] font-medium tabular-nums", color, className)}>
      <AdminIcon name={icon} size={12} strokeWidth={2.5} />
      {delta.text.replace(/^[+-]/, "")}
      {suffix ? <span className="ml-1 font-sans font-normal text-muted">{suffix}</span> : null}
    </span>
  );
}

export default function KpiTile({
  label,
  value,
  delta,
  deltaSuffix = "vs prev.",
  hint,
  sub,
  sparkline,
  icon,
  accent = false,
  loading = false,
  href,
  onClick,
  className,
}: {
  label: string;
  /** Formatted value ("1,284", "2:31", "4.2%"). Use "-" when nothing was measured. */
  value: ReactNode;
  delta?: Delta | null;
  deltaSuffix?: string;
  /** Plain-English definition (DEFINITIONS from lib/analytics/report). */
  hint?: string;
  /** Small line under the value ("of 340 visitors"). */
  sub?: ReactNode;
  /** A <Sparkline/> (or any small chart) under the value. */
  sparkline?: ReactNode;
  icon?: AdminIconName;
  /** Orange value + border, for "needs attention" figures. */
  accent?: boolean;
  loading?: boolean;
  /** Makes the tile a link (e.g. "#/landing"). */
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={cx(eyebrow, "flex min-w-0 items-center gap-1.5")}>
          {icon ? <AdminIcon name={icon} size={14} className={cx("shrink-0 max-[399px]:hidden", accent && "text-accent")} /> : null}
          <span className="truncate">{label}</span>
        </span>
        {hint ? <InfoTip text={hint} label={`About ${label}`} /> : null}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-20" />
      ) : (
        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cx(
              "font-mono text-[clamp(1.375rem,1.15rem+0.7vw,1.75rem)] font-medium leading-none tracking-[-0.03em]",
              accent ? "text-accent" : "text-fg",
            )}
          >
            {value}
          </span>
          {delta ? <DeltaText delta={delta} /> : null}
        </div>
      )}
      {sub || (delta && deltaSuffix) ? (
        <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-snug text-muted text-pretty [overflow-wrap:anywhere]">{sub ?? deltaSuffix}</p>
      ) : null}
      {sparkline ? <div className="mt-3 min-w-0">{sparkline}</div> : null}
    </>
  );
  const interactive = Boolean(href || onClick);
  const cls = cx(
    surface.card,
    "relative block min-w-0 p-3.5 text-left min-[400px]:p-4 [&_[aria-label^='About']]:relative [&_[aria-label^='About']]:z-10",
    accent && "border-accent/50",
    interactive && "transition-colors hover:border-line-strong hover:bg-[#161820]",
    className,
  );
  // A stretched link/button keeps the info tip (a button) out of the interactive element.
  const overlay = cx("absolute inset-0 rounded-[inherit]", focusRing);
  return (
    <div className={cls}>
      {body}
      {href ? <a href={href} aria-label={label} className={overlay} /> : null}
      {!href && onClick ? <button type="button" aria-label={label} onClick={onClick} className={overlay} /> : null}
    </div>
  );
}
