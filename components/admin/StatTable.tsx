import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Numbers are right-aligned in Geist Mono. */
  numeric?: boolean;
  className?: string;
};

/** Hairline data table that scrolls horizontally inside its own box on narrow screens. */
export default function StatTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty = "No data in this range.",
  captionVisible = false,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: string;
  captionVisible?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto" tabIndex={rows.length ? 0 : undefined} role="region" aria-label={caption}>
        <table className="w-full min-w-[22rem] border-collapse text-left text-[0.8125rem]">
          <caption
            className={
              captionVisible ? "eyebrow mb-3 text-left text-muted" : "sr-only"
            }
          >
            {caption}
          </caption>
          <thead>
            <tr className="border-b border-ink">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`eyebrow py-2 pr-4 font-medium text-muted last:pr-0 ${column.numeric ? "text-right" : ""} ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-b border-line">
                <td colSpan={columns.length} className="py-4 text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={rowKey(row, index)} className="border-b border-line align-top">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={`py-2.5 pr-4 last:pr-0 ${
                        column.numeric ? "whitespace-nowrap text-right font-mono tabular-nums" : "break-words"
                      } ${column.className ?? ""}`}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
