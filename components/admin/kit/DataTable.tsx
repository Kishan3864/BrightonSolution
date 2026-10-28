"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { navigate } from "../shell/router";
import AdminIcon from "./AdminIcon";
import { Button } from "./Button";
import { EmptyState, Skeleton } from "./Feedback";
import { cx, surface } from "./cx";

/**
 * Responsive data table. In a wide container it is a real <table> (sortable headers with aria-sort,
 * optional sticky header, clickable rows). In a narrow container (phones, half-width cards) the same
 * rows become a stacked card list, so nothing ever scrolls sideways on a phone. The switch uses a
 * CSS container query, so it follows the space the table actually has, not the window width.
 * Search and filters live outside: pass the already-filtered rows. Long lists grow with "Show more".
 */

export type SortDir = "asc" | "desc";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. Strings sort case-insensitively; null sorts last. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right";
  /** CSS width for the table column, e.g. "8rem". */
  width?: string;
  /** Hide this column in table layout when the container is narrower than md (48rem), lg (64rem) or xl (72rem). */
  hideBelow?: "md" | "lg" | "xl";
  /**
   * Role in the phone card: title (bold first line), badge (top-right), subtitle (under the title),
   * field (label: value grid, the default), meta (small muted line at the bottom), hidden.
   */
  mobile?: "title" | "badge" | "subtitle" | "field" | "meta" | "hidden";
  /** Label used in the phone card's field grid (defaults to header when it is a string). */
  mobileLabel?: string;
  /** Extra classes for the table cell. */
  className?: string;
};

const SHOW_TABLE: Record<"sm" | "md" | "lg", { table: string; cards: string }> = {
  sm: { table: "hidden @lg:block", cards: "@lg:hidden" },
  md: { table: "hidden @2xl:block", cards: "@2xl:hidden" },
  lg: { table: "hidden @4xl:block", cards: "@4xl:hidden" },
};

const HIDE_BELOW: Record<"md" | "lg" | "xl", string> = {
  md: "hidden @3xl:table-cell",
  lg: "hidden @5xl:table-cell",
  xl: "hidden @6xl:table-cell",
};

const OVERLAY =
  "absolute inset-0 focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

const CONTENT_PASSTHROUGH =
  "pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_select]:pointer-events-auto [&_input]:pointer-events-auto [&_textarea]:pointer-events-auto [&_label]:pointer-events-auto";

function compare(a: string | number | null | undefined, b: string | number | null | undefined): number {
  const an = a === null || a === undefined || a === "";
  const bn = b === null || b === undefined || b === "";
  if (an || bn) return an && bn ? 0 : an ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

/** True when the click started on a control inside the row (links, buttons, inputs keep their own behaviour). */
function fromControl(event: MouseEvent | KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  const row = event.currentTarget as HTMLElement;
  const hit = target?.closest("a, button, input, select, textarea, label, [role='button']");
  return Boolean(hit && hit !== row && row.contains(hit));
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  rowHref,
  onRowClick,
  selectedKey,
  initialSort,
  pageSize = 50,
  resetKey,
  sortResetKey,
  rowLabel,
  empty,
  loading = false,
  breakpoint = "md",
  maxHeight,
  rowClassName,
  renderCard,
  bare = false,
  dense = false,
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  /** Screen-reader caption describing the table. */
  caption: string;
  /** Hash link for a row ("#/contacts/abc"): rows and cards become links to it. */
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Highlights the row whose key matches (e.g. the one open in the drawer). */
  selectedKey?: string | null;
  initialSort?: { key: string; dir: SortDir };
  /** Rows shown before "Show more" (default 50). */
  pageSize?: number;
  /** Change this (e.g. to the filter string) to collapse back to the first page. */
  resetKey?: string;
  /**
   * Change this when the view sorts `rows` itself (e.g. a Sort select): a column-header sort is then
   * cleared, so the view's own order shows instead of being silently overridden.
   */
  sortResetKey?: string;
  /** Accessible name of the phone card's open link, e.g. "Open Asha Rao, new" (default "Open details"). */
  rowLabel?: (row: T) => string;
  /** Shown when rows is empty (an EmptyState). */
  empty?: ReactNode;
  loading?: boolean;
  /** Container width from which the table layout replaces cards: sm 32rem, md 42rem (default), lg 56rem. */
  breakpoint?: "sm" | "md" | "lg";
  /** Bounds the table height (e.g. "calc(100dvh - 16rem)") so the header sticks while the body scrolls. */
  maxHeight?: string;
  rowClassName?: (row: T) => string | undefined;
  /** Fully custom phone card for a row (replaces the column-driven card). */
  renderCard?: (row: T) => ReactNode;
  /** No outer card surface (when the table already sits inside a Card). */
  bare?: boolean;
  dense?: boolean;
}) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [resetKey, pageSize]);

  // Only on a change of sortResetKey (not on mount, where initialSort already applies).
  const [sortResetSeen, setSortResetSeen] = useState(sortResetKey);
  if (sortResetKey !== sortResetSeen) {
    setSortResetSeen(sortResetKey);
    setSort(null);
  }

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const pick = column.sortValue;
    const out = [...rows].sort((a, b) => compare(pick(a), pick(b)));
    return sort.dir === "desc" ? out.reverse() : out;
  }, [rows, columns, sort]);

  const visible = sorted.slice(0, limit);
  const clickable = Boolean(rowHref || onRowClick);
  const activate = (row: T) => {
    if (onRowClick) onRowClick(row);
    else if (rowHref) navigate(rowHref(row));
  };

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: "desc" };
      return current.dir === "desc" ? { key, dir: "asc" } : null;
    });
  };

  const frame = bare ? "" : surface.card;
  const show = SHOW_TABLE[breakpoint];

  if (loading && rows.length === 0) {
    return (
      <div className={cx(frame, "space-y-3 p-4")} aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className={cx(frame)}>{empty ?? <EmptyState compact title="Nothing here yet" />}</div>;
  }

  const titleCols = columns.filter((c) => c.mobile === "title");
  const badgeCols = columns.filter((c) => c.mobile === "badge");
  const subtitleCols = columns.filter((c) => c.mobile === "subtitle");
  const metaCols = columns.filter((c) => c.mobile === "meta");
  const fieldCols = columns.filter((c) => (c.mobile ?? "field") === "field");
  // Without an explicit title the first column leads the card.
  const leadCols = titleCols.length ? titleCols : columns.slice(0, 1);
  const fields = titleCols.length ? fieldCols : fieldCols.filter((c) => c !== columns[0]);

  return (
    <div className="@container min-w-0">
      {/* ------------------------------------------------------------ table layout */}
      <div className={cx(show.table, frame, "min-w-0 overflow-hidden")}>
        <div className={cx("min-w-0 overflow-x-auto", maxHeight && "overflow-y-auto overscroll-contain")} style={maxHeight ? { maxHeight } : undefined}>
          <table className="w-full border-collapse text-left text-[0.8125rem]">
            <caption className="sr-only">{caption}</caption>
            <colgroup>
              {columns.map((c) => (
                <col key={c.key} style={c.width ? { width: c.width } : undefined} className={c.hideBelow ? HIDE_BELOW[c.hideBelow] : undefined} />
              ))}
            </colgroup>
            <thead className={cx(maxHeight && "sticky top-0 z-[1]", "bg-surface")}>
              <tr className="border-b border-line">
                {columns.map((c) => {
                  const active = sort?.key === c.key;
                  const ariaSort = active ? (sort?.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={ariaSort}
                      className={cx(
                        "whitespace-nowrap px-4 py-2.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-muted",
                        c.align === "right" && "text-right",
                        c.hideBelow && HIDE_BELOW[c.hideBelow],
                      )}
                    >
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={cx(
                            "-mx-1.5 inline-flex items-center gap-1 rounded-[0.4rem] px-1.5 py-1 uppercase transition-colors hover:text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-accent",
                            active && "text-fg",
                            c.align === "right" && "flex-row-reverse",
                          )}
                        >
                          {c.header}
                          <AdminIcon
                            name={active ? (sort?.dir === "asc" ? "arrowUp" : "arrowDown") : "sort"}
                            size={12}
                            className={active ? "text-accent" : "opacity-40"}
                          />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const key = rowKey(row);
                const selected = selectedKey === key;
                return (
                  <tr
                    key={key}
                    tabIndex={clickable ? 0 : undefined}
                    aria-selected={selectedKey !== undefined ? selected : undefined}
                    onClick={clickable ? (event) => !fromControl(event) && activate(row) : undefined}
                    onKeyDown={
                      clickable
                        ? (event) => {
                            if ((event.key === "Enter" || event.key === " ") && !fromControl(event)) {
                              event.preventDefault();
                              activate(row);
                            }
                          }
                        : undefined
                    }
                    className={cx(
                      "border-b border-line last:border-b-0 align-top transition-colors",
                      clickable && "cursor-pointer hover:bg-fg/[0.03] focus:outline-none focus-visible:bg-fg/[0.05] focus-visible:shadow-[inset_3px_0_0_var(--color-accent)]",
                      selected && "bg-accent/[0.07] shadow-[inset_3px_0_0_var(--color-accent)]",
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cx(
                          "min-w-0 px-4 text-fg",
                          dense ? "py-2" : "py-3",
                          c.align === "right" && "text-right font-mono tabular-nums",
                          c.hideBelow && HIDE_BELOW[c.hideBelow],
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- card layout */}
      <ul className={cx(show.cards, frame, "min-w-0 divide-y divide-line overflow-hidden")} aria-label={caption}>
        {visible.map((row) => {
          const key = rowKey(row);
          const selected = selectedKey === key;
          const href = rowHref?.(row);
          const label = rowLabel?.(row) ?? "Open details";
          return (
            <li
              key={key}
              className={cx("relative min-w-0 px-4 py-3.5", clickable && "active:bg-fg/[0.04]", selected && "bg-accent/[0.07]", rowClassName?.(row))}
            >
              {href ? (
                <a href={href} aria-label={label} className={OVERLAY} />
              ) : onRowClick ? (
                <button type="button" aria-label={label} onClick={() => onRowClick(row)} className={OVERLAY} />
              ) : null}
              {/* Content sits above the stretched link but lets taps fall through, except on its own controls. */}
              <div className={cx("relative min-w-0", clickable && CONTENT_PASSTHROUGH)}>
              {renderCard ? (
                renderCard(row)
              ) : (
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-[0.9375rem] font-medium text-fg [overflow-wrap:anywhere]">
                      {leadCols.map((c) => (
                        <div key={c.key}>{c.cell(row)}</div>
                      ))}
                    </div>
                    {badgeCols.length ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {badgeCols.map((c) => (
                          <div key={c.key}>{c.cell(row)}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {subtitleCols.map((c) => (
                    <div key={c.key} className="mt-0.5 min-w-0 text-[0.8125rem] text-muted [overflow-wrap:anywhere]">
                      {c.cell(row)}
                    </div>
                  ))}
                  {fields.length ? (
                    <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[0.8125rem] @xs:grid-cols-2">
                      {fields.map((c) => (
                        <div key={c.key} className="min-w-0">
                          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-muted">
                            {c.mobileLabel ?? (typeof c.header === "string" ? c.header : c.key)}
                          </dt>
                          <dd className={cx("min-w-0 text-fg [overflow-wrap:anywhere]", c.align === "right" && "font-mono tabular-nums")}>{c.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {metaCols.length ? (
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-muted">
                      {metaCols.map((c) => (
                        <span key={c.key} className="min-w-0">
                          {c.cell(row)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              </div>
            </li>
          );
        })}
      </ul>

      {sorted.length > limit ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-muted">
          <span className="font-mono tabular-nums">
            Showing {visible.length.toLocaleString()} of {sorted.length.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setLimit((n) => n + pageSize)} icon="chevronDown">
              Show {Math.min(pageSize, sorted.length - limit).toLocaleString()} more
            </Button>
            {sorted.length - limit > pageSize ? (
              <Button size="sm" variant="ghost" onClick={() => setLimit(sorted.length)}>
                Show all
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
