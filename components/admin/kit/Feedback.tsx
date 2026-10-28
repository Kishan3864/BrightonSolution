import type { ReactNode } from "react";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { cx } from "./cx";

/** Status surfaces: Notice (inline message), EmptyState (nothing to show yet) and Skeleton (loading shape). */

export type NoticeTone = "neutral" | "error" | "success" | "warning";

const NOTICE: Record<NoticeTone, { bar: string; icon: AdminIconName; iconColor: string; title: string }> = {
  neutral: { bar: "border-l-accent", icon: "info", iconColor: "text-accent", title: "text-fg" },
  error: { bar: "border-l-[#ff8a7a]", icon: "alert", iconColor: "text-[#ff8a7a]", title: "text-[#ff8a7a]" },
  success: { bar: "border-l-[#6fd49a]", icon: "check", iconColor: "text-[#8fe2b1]", title: "text-fg" },
  warning: { bar: "border-l-accent-2", icon: "alert", iconColor: "text-accent-2", title: "text-fg" },
};

export function Notice({
  tone = "neutral",
  title,
  children,
  action,
  role,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Button(s) on the right (below the text on phones). */
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  const t = NOTICE[tone];
  return (
    <div
      role={role}
      className={cx(
        "flex flex-col gap-3 rounded-sharp border border-line border-l-[3px] bg-surface-2 px-4 py-3 text-[0.875rem] leading-relaxed sm:flex-row sm:items-center",
        t.bar,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <AdminIcon name={t.icon} size={18} className={cx("mt-0.5", t.iconColor)} />
        <div className="min-w-0 flex-1">
          {title ? <p className={cx("font-medium", t.title)}>{title}</p> : null}
          {children ? (
            <div className="text-muted [overflow-wrap:anywhere] [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-fg [&_strong]:font-medium [&_strong]:text-fg">
              {children}
            </div>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2 pl-[30px] sm:pl-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon?: AdminIconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Smaller padding for use inside cards. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full border border-line bg-fg/[0.04] text-muted">
        <AdminIcon name={icon} size={20} />
      </span>
      <p className="text-[0.9375rem] font-medium text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-[46ch] text-[0.8125rem] leading-relaxed text-muted text-pretty">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Pulsing placeholder block. Size it with className (h-*, w-*). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-pulse rounded-sharp bg-fg/[0.07]", className)} />;
}

/** A card-shaped group of skeleton lines, for a whole panel that is still loading. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("rounded-[var(--radius-card)] border border-line bg-surface p-5", className)}>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cx("h-3", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}
