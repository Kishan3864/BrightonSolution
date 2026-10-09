/**
 * CSV export for the /admin dashboard (RFC 4180 quoting, UTF-8 BOM for Excel).
 * Cells that start with = + - @ tab or CR are prefixed with ' so spreadsheet apps never
 * evaluate visitor-supplied text as a formula (CSV injection).
 */

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

function cell(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) text = "";
  else if (value instanceof Date) text = Number.isNaN(value.getTime()) ? "" : value.toISOString();
  else text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((column) => cell(column.header)).join(",")];
  for (const row of rows) lines.push(columns.map((column) => cell(column.value(row))).join(","));
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  try {
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* download blocked: nothing else to do */
  }
}
