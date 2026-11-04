// lib/runtime.ts
// Pure validation, formatting, and summary logic for Card Box screen runtime.
// Kept free of Supabase/Next imports so it can be unit-tested directly.

import { validateReportDate } from "./entries.ts";

export const SCREEN_RUNTIME_AGENCIES = ["Card Box"] as const;

export const RUNTIME_SHIFTS = ["Day", "Night"] as const;
export type RuntimeShift = (typeof RUNTIME_SHIFTS)[number];

export interface ScreenRuntimeLog {
  id?: string;
  phase_agency_id?: string;
  log_date: string;
  shift: RuntimeShift;
  /** Null while the shift is open: only the opening meter reading is saved. */
  red_runtime_min: number | null;
  red_breakdown_min: number | null;
  red_breakdown_reasons?: string | null;
  /** The yellow screen has left the site: null on every row logged since. */
  yellow_runtime_min?: number | null;
  yellow_breakdown_min?: number | null;
  yellow_breakdown_reasons?: string | null;
  created_by?: string;
  created_at?: string;
}

/** Red screen only; the yellow columns are never written by the app any more. */
export interface RuntimeLogValues {
  log_date: string;
  shift: RuntimeShift;
  red_runtime_min: number | null;
  red_breakdown_min: number | null;
  red_breakdown_reasons: string | null;
}

/** Raw hour-meter readings for audit; null for a screen entered manually. */
export interface MeterReadings {
  red_open: number | null;
  red_close: number | null;
  yellow_open: number | null;
  yellow_close: number | null;
}

/** What the form can write: yellow readings stay only on rows logged earlier. */
export interface RedMeterReadings {
  red_open: number | null;
  red_close: number | null;
}

export interface RuntimeValidationResult {
  valid: boolean;
  value?: RuntimeLogValues;
  meter?: RedMeterReadings;
  errors?: Record<string, string>;
}

export interface RuntimeSummary {
  /** Completed shifts: open shifts (no closing reading yet) are not counted. */
  shifts: number;
  red: {
    avgRunMin: number;
    avgBreakdownMin: number;
  };
  /** Null when none of the shifts in range carry yellow data. */
  yellow: {
    avgRunMin: number;
    avgBreakdownMin: number;
  } | null;
}

/** Formats whole minutes into "9 h 30 m", "11 h 00 m", "22 m", or "0 m". */
export function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "0 m";
  const hours = Math.floor(min / 60);
  const remMin = Math.round(min % 60);

  if (hours === 0) {
    return `${remMin} m`;
  }

  const paddedMin = String(remMin).padStart(2, "0");
  return `${hours} h ${paddedMin} m`;
}

/**
 * Computes average runtime and breakdown across completed shift rows. Open shifts
 * are skipped; yellow averages cover only rows that still carry yellow data.
 * Returns null if no shift is completed.
 */
export function summarizeRuntime(
  rows: ScreenRuntimeLog[] | null | undefined
): RuntimeSummary | null {
  const done = (rows ?? []).filter((r) => r.red_runtime_min != null);
  if (done.length === 0) return null;

  const avg = (values: number[]) =>
    Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

  const yellowRows = done.filter((r) => r.yellow_runtime_min != null);

  return {
    shifts: done.length,
    red: {
      avgRunMin: avg(done.map((r) => r.red_runtime_min ?? 0)),
      avgBreakdownMin: avg(done.map((r) => r.red_breakdown_min ?? 0)),
    },
    yellow:
      yellowRows.length > 0
        ? {
            avgRunMin: avg(yellowRows.map((r) => r.yellow_runtime_min ?? 0)),
            avgBreakdownMin: avg(yellowRows.map((r) => r.yellow_breakdown_min ?? 0)),
          }
        : null,
  };
}

/** Parses hours: must be blank or an integer from 0 to 12. */
export function parseHours(
  raw: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const str = String(raw).trim();
  if (str === "") return { ok: true, value: null };

  if (!/^\d+$/.test(str)) {
    return { ok: false, error: "Hours must be a whole number from 0 to 12" };
  }

  const num = Number(str);
  if (num < 0 || num > 12) {
    return { ok: false, error: "Hours must be a whole number from 0 to 12" };
  }

  return { ok: true, value: num };
}

/** Parses minutes: must be blank or an integer from 0 to 59. */
export function parseMinutes(
  raw: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const str = String(raw).trim();
  if (str === "") return { ok: true, value: null };

  if (!/^\d+$/.test(str)) {
    return { ok: false, error: "Minutes must be a whole number from 0 to 59" };
  }

  const num = Number(str);
  if (num < 0 || num > 59) {
    return { ok: false, error: "Minutes must be a whole number from 0 to 59" };
  }

  return { ok: true, value: num };
}

export const SHIFT_MINUTES = 720;

/**
 * Parses an hour-meter reading: blank, or a non-negative number with up to
 * 2 decimals (e.g. "1234", "1234.5"). Returns null for blank.
 */
export function parseMeterReading(
  raw: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const str = String(raw).trim();
  if (str === "") return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return { ok: false, error: "Enter a reading like 1234.5" };
  }
  return { ok: true, value: Number(str) };
}

/**
 * Runtime in whole minutes from opening/closing hour-meter readings
 * (meter counts decimal hours). Breakdown is the rest of the 12 h shift.
 */
export function runtimeFromMeter(
  opening: number,
  closing: number
): { runtimeMin: number; breakdownMin: number } | { error: string } {
  if (closing < opening) {
    return { error: "Closing reading can't be less than opening" };
  }
  const runtimeMin = Math.round((closing - opening) * 60);
  if (runtimeMin > SHIFT_MINUTES) {
    return { error: "Closing minus opening can't be more than 12 h" };
  }
  return { runtimeMin, breakdownMin: SHIFT_MINUTES - runtimeMin };
}

interface ScreenResult {
  runtimeMin: number | null;
  breakdownMin: number | null;
  reasons: string | null;
  meter: { open: number | null; close: number | null };
}

/** Validates the red screen section of a runtime log (the only screen on site). */
function validateRedScreen(
  raw: Record<string, unknown>,
  errors: Record<string, string>
): ScreenResult {
  const rawReasons = raw.red_breakdown_reasons;
  const reasons =
    typeof rawReasons === "string" && rawReasons.trim() ? rawReasons.trim() : null;

  if (raw.red_mode === "meter") {
    const openParsed = parseMeterReading(raw.red_meter_open);
    const closeParsed = parseMeterReading(raw.red_meter_close);
    if (!openParsed.ok) errors.red_meter_open = openParsed.error;
    if (!closeParsed.ok) errors.red_meter_close = closeParsed.error;
    if (openParsed.ok && openParsed.value === null) {
      errors.red_meter_open = "Enter the opening reading";
    }

    const open = openParsed.ok ? openParsed.value : null;
    const close = closeParsed.ok ? closeParsed.value : null;

    // Opening reading only: the shift stays open until the closing reading is added.
    let runtimeMin: number | null = null;
    let breakdownMin: number | null = null;
    if (open !== null && close !== null) {
      const calc = runtimeFromMeter(open, close);
      if ("error" in calc) {
        errors.red_meter_close = calc.error;
      } else {
        runtimeMin = calc.runtimeMin;
        breakdownMin = calc.breakdownMin;
        if (breakdownMin > 0 && !reasons) {
          errors.red_breakdown_reasons = "Add a reason for the breakdown";
        }
      }
    }

    return { runtimeMin, breakdownMin, reasons, meter: { open, close } };
  }

  const runHParsed = parseHours(raw.red_runtime_h);
  if (!runHParsed.ok) errors.red_runtime_h = runHParsed.error;

  const runMParsed = parseMinutes(raw.red_runtime_m);
  if (!runMParsed.ok) errors.red_runtime_m = runMParsed.error;

  const bdHParsed = parseHours(raw.red_breakdown_h);
  if (!bdHParsed.ok) errors.red_breakdown_h = bdHParsed.error;

  const bdMParsed = parseMinutes(raw.red_breakdown_m);
  if (!bdMParsed.ok) errors.red_breakdown_m = bdMParsed.error;

  const runH = runHParsed.ok ? runHParsed.value : null;
  const runM = runMParsed.ok ? runMParsed.value : null;
  const bdH = bdHParsed.ok ? bdHParsed.value : null;
  const bdM = bdMParsed.ok ? bdMParsed.value : null;

  if (runHParsed.ok && runMParsed.ok && runH === null && runM === null) {
    errors.red_runtime = "Enter the runtime (0 is fine)";
  }

  const runTotalMin = (runH ?? 0) * 60 + (runM ?? 0);
  const bdTotalMin = (bdH ?? 0) * 60 + (bdM ?? 0);

  if (
    runHParsed.ok &&
    runMParsed.ok &&
    bdHParsed.ok &&
    bdMParsed.ok &&
    (runH !== null || runM !== null) &&
    runTotalMin + bdTotalMin > SHIFT_MINUTES
  ) {
    errors.red_runtime = "Runtime + breakdown can't be more than 12 h";
  }

  if (bdTotalMin > 0 && !reasons) {
    errors.red_breakdown_reasons = "Add a reason for the breakdown";
  }

  return {
    runtimeMin: runTotalMin,
    breakdownMin: bdTotalMin,
    reasons,
    meter: { open: null, close: null },
  };
}

/** Validates runtime log input for the red screen. */
export function validateRuntimeLog(
  raw: Record<string, unknown>,
  today: string
): RuntimeValidationResult {
  const errors: Record<string, string> = {};

  const dateResult = validateReportDate(raw.log_date, today);
  if (!dateResult.ok) {
    errors.log_date = dateResult.error;
  }

  let shift: RuntimeShift = "Day";
  if (raw.shift === "Day" || raw.shift === "Night") {
    shift = raw.shift;
  } else {
    errors.shift = "Select a shift";
  }

  const red = validateRedScreen(raw, errors);

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    meter: { red_open: red.meter.open, red_close: red.meter.close },
    value: {
      log_date: dateResult.ok ? dateResult.value : "",
      shift,
      red_runtime_min: red.runtimeMin,
      red_breakdown_min: red.breakdownMin,
      red_breakdown_reasons: red.reasons,
    },
  };
}
