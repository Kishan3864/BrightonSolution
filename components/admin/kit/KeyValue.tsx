import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Label/value list for detail panels. Empty values ("", null, undefined) are skipped, so callers can
 * pass every field and only filled ones show. Two columns from a 28rem container width.
 */

export type KeyValueItem = { label: string; value: ReactNode; /** Span both columns (long text, URLs). */ wide?: boolean; mono?: boolean };

function isEmpty(value: ReactNode): boolean {
  return value === null || value === undefined || value === false || (typeof value === "string" && value.trim() === "");
}

export default function KeyValue({
  items,
  columns = 2,
  className,
}: {
  items: readonly KeyValueItem[];
  columns?: 1 | 2;
  className?: string;
}) {
  const shown = items.filter((item) => !isEmpty(item.value));
  if (shown.length === 0) return null;
  return (
    <div className="@container min-w-0">
      <dl className={cx("grid grid-cols-1 gap-x-6 gap-y-3", columns === 2 && "@md:grid-cols-2", className)}>
        {shown.map((item) => (
          <div key={item.label} className={cx("min-w-0", item.wide && "@md:col-span-2")}>
            <dt className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">{item.label}</dt>
            <dd className={cx("mt-0.5 min-w-0 text-[0.875rem] text-fg [overflow-wrap:anywhere]", item.mono && "font-mono text-[0.8125rem]")}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
