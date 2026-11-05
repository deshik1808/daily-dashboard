// lib/runtime-report.ts
// Pure data preparation for the shift-wise screen runtime PDF. Kept free of Next,
// Supabase and pdf-lib imports so it can be unit-tested directly.

import { validateReportDate } from "./entries.ts";
import {
  formatDuration,
  type MeterReadings,
  type ScreenRuntimeLog,
} from "./runtime.ts";

/** Longest period one report may cover. */
export const MAX_REPORT_DAYS = 366;

export type ReportRange =
  | { ok: true; from: string; to: string }
  | { ok: false; error: string };

/** Validates the From and To dates of a report request. */
export function validateReportRange(
  rawFrom: unknown,
  rawTo: unknown,
  today: string
): ReportRange {
  const from = validateReportDate(rawFrom, today);
  if (!from.ok) return { ok: false, error: `From: ${from.error}` };
  const to = validateReportDate(rawTo, today);
  if (!to.ok) return { ok: false, error: `To: ${to.error}` };

  if (from.value > to.value) {
    return { ok: false, error: "From date can't be after the To date" };
  }
  const days =
    (Date.parse(`${to.value}T00:00:00Z`) - Date.parse(`${from.value}T00:00:00Z`)) /
      86_400_000 +
    1;
  if (days > MAX_REPORT_DAYS) {
    return { ok: false, error: "Choose a period of up to one year" };
  }
  return { ok: true, from: from.value, to: to.value };
}

export interface ReportRow {
  /** Index of the shift this row belongs to; Red and Yellow of one shift share it. */
  group: number;
  /** Date and shift are filled on the first row of a shift only. */
  date: string;
  shift: string;
  screen: "Red" | "Yellow";
  meter: string;
  runtime: string;
  breakdown: string;
  reasons: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-10-02" -> "02 Oct 2026". Works on the string, so no time zone can shift it. */
export function formatReportDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

const dash = "—";

function meterText(open: number | null | undefined, close: number | null | undefined) {
  if (open == null) return dash;
  // "to", not an arrow: the PDF's built-in font has no arrow glyph.
  return `${open} to ${close ?? dash}`;
}

function breakdownText(min: number | null | undefined) {
  return min ? formatDuration(min) : dash;
}

/**
 * Turns runtime logs into table rows for the report: chronological (oldest first,
 * Day before Night), limited to [from, to], one row per screen. Yellow rows appear
 * only for shifts that still carry yellow data.
 */
export function buildReportRows(
  logs: ScreenRuntimeLog[],
  meterByLog: Record<string, MeterReadings>,
  from: string,
  to: string
): ReportRow[] {
  const inRange = logs
    .filter((l) => l.log_date >= from && l.log_date <= to)
    .sort((a, b) => {
      if (a.log_date !== b.log_date) return a.log_date < b.log_date ? -1 : 1;
      if (a.shift === b.shift) return 0;
      return a.shift === "Day" ? -1 : 1;
    });

  const rows: ReportRow[] = [];
  inRange.forEach((log, group) => {
    const meter = log.id ? meterByLog[log.id] : undefined;
    const isOpen = log.red_runtime_min == null;

    rows.push({
      group,
      date: formatReportDate(log.log_date),
      shift: log.shift,
      screen: "Red",
      meter: meterText(meter?.red_open, meter?.red_close),
      runtime: isOpen ? "Awaiting closing" : formatDuration(log.red_runtime_min ?? 0),
      breakdown: isOpen ? dash : breakdownText(log.red_breakdown_min),
      reasons: log.red_breakdown_reasons ?? "",
    });

    if (log.yellow_runtime_min != null) {
      rows.push({
        group,
        date: "",
        shift: "",
        screen: "Yellow",
        meter: meterText(meter?.yellow_open, meter?.yellow_close),
        runtime: formatDuration(log.yellow_runtime_min),
        breakdown: breakdownText(log.yellow_breakdown_min),
        reasons: log.yellow_breakdown_reasons ?? "",
      });
    }
  });
  return rows;
}

/**
 * Makes text drawable with the PDF's built-in (WinAnsi) font: typographic dashes,
 * quotes and the bullet survive; anything else the font lacks becomes "?". A
 * leading "- " (the bullet-textarea marker) is shown as a bullet. Newlines are kept.
 */
export function pdfSafeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/^(\s*)[-*]\s+/, "$1• "))
    .join("\n")
    .replace(
      /[^\n\x20-\x7E\xA0-\xFF•–—‘’“”…€]/g,
      "?"
    );
}

/** e.g. "Screen-Runtime-Card-Box-2026-10-01-to-2026-10-31.pdf" */
export function reportFileName(agency: string, from: string, to: string): string {
  const slug = agency.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Report";
  return `Screen-Runtime-${slug}-${from}-to-${to}.pdf`;
}
