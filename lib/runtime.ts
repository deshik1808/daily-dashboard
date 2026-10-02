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
  red_runtime_min: number;
  red_breakdown_min: number;
  red_breakdown_reasons?: string | null;
  yellow_runtime_min: number;
  yellow_breakdown_min: number;
  yellow_breakdown_reasons?: string | null;
  created_by?: string;
  created_at?: string;
}

export interface RuntimeLogValues {
  log_date: string;
  shift: RuntimeShift;
  red_runtime_min: number;
  red_breakdown_min: number;
  red_breakdown_reasons: string | null;
  yellow_runtime_min: number;
  yellow_breakdown_min: number;
  yellow_breakdown_reasons: string | null;
}

export interface RuntimeValidationResult {
  valid: boolean;
  value?: RuntimeLogValues;
  errors?: Record<string, string>;
}

export interface RuntimeSummary {
  shifts: number;
  red: {
    avgRunMin: number;
    avgBreakdownMin: number;
  };
  yellow: {
    avgRunMin: number;
    avgBreakdownMin: number;
  };
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
 * Computes average runtime and breakdown for Red and Yellow screens across shift rows.
 * Returns null if rows is empty.
 */
export function summarizeRuntime(
  rows: ScreenRuntimeLog[]
): RuntimeSummary | null {
  if (!rows || rows.length === 0) return null;

  let totalRedRun = 0;
  let totalRedBreakdown = 0;
  let totalYellowRun = 0;
  let totalYellowBreakdown = 0;

  for (const row of rows) {
    totalRedRun += row.red_runtime_min;
    totalRedBreakdown += row.red_breakdown_min;
    totalYellowRun += row.yellow_runtime_min;
    totalYellowBreakdown += row.yellow_breakdown_min;
  }

  const count = rows.length;

  return {
    shifts: count,
    red: {
      avgRunMin: Math.round(totalRedRun / count),
      avgBreakdownMin: Math.round(totalRedBreakdown / count),
    },
    yellow: {
      avgRunMin: Math.round(totalYellowRun / count),
      avgBreakdownMin: Math.round(totalYellowBreakdown / count),
    },
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

/** Validates runtime log input for both screens. */
export function validateRuntimeLog(
  raw: Record<string, unknown>,
  today: string
): RuntimeValidationResult {
  const errors: Record<string, string> = {};

  // 1. Date
  const dateResult = validateReportDate(raw.log_date, today);
  if (!dateResult.ok) {
    errors.log_date = dateResult.error;
  }

  // 2. Shift
  const rawShift = raw.shift;
  let shift: RuntimeShift = "Day";
  if (rawShift === "Day" || rawShift === "Night") {
    shift = rawShift;
  } else {
    errors.shift = "Select a shift";
  }

  // Screens validation helper
  function validateScreen(prefix: "red" | "yellow") {
    const rawRunH = raw[`${prefix}_runtime_h`];
    const rawRunM = raw[`${prefix}_runtime_m`];
    const rawBdH = raw[`${prefix}_breakdown_h`];
    const rawBdM = raw[`${prefix}_breakdown_m`];
    const rawReasons = raw[`${prefix}_breakdown_reasons`];

    const runHParsed = parseHours(rawRunH);
    if (!runHParsed.ok) errors[`${prefix}_runtime_h`] = runHParsed.error;

    const runMParsed = parseMinutes(rawRunM);
    if (!runMParsed.ok) errors[`${prefix}_runtime_m`] = runMParsed.error;

    const bdHParsed = parseHours(rawBdH);
    if (!bdHParsed.ok) errors[`${prefix}_breakdown_h`] = bdHParsed.error;

    const bdMParsed = parseMinutes(rawBdM);
    if (!bdMParsed.ok) errors[`${prefix}_breakdown_m`] = bdMParsed.error;

    const runH = runHParsed.ok ? runHParsed.value : null;
    const runM = runMParsed.ok ? runMParsed.value : null;

    if (runHParsed.ok && runMParsed.ok) {
      if (runH === null && runM === null) {
        errors[`${prefix}_runtime`] = "Enter the runtime (0 is fine)";
      }
    }

    const bdH = bdHParsed.ok ? bdHParsed.value : null;
    const bdM = bdMParsed.ok ? bdMParsed.value : null;

    const runTotalMin = (runH ?? 0) * 60 + (runM ?? 0);
    const bdTotalMin = (bdH ?? 0) * 60 + (bdM ?? 0);

    if (
      runHParsed.ok &&
      runMParsed.ok &&
      bdHParsed.ok &&
      bdMParsed.ok &&
      (runH !== null || runM !== null)
    ) {
      if (runTotalMin + bdTotalMin > 720) {
        errors[`${prefix}_runtime`] =
          "Runtime + breakdown can't be more than 12 h";
      }
    }

    let reasons: string | null = null;
    if (typeof rawReasons === "string") {
      const trimmed = rawReasons.trim();
      reasons = trimmed.length > 0 ? trimmed : null;
    }

    if (bdTotalMin > 0 && !reasons) {
      errors[`${prefix}_breakdown_reasons`] = "Add a reason for the breakdown";
    }

    return {
      runtimeMin: runTotalMin,
      breakdownMin: bdTotalMin,
      reasons,
    };
  }

  const red = validateScreen("red");
  const yellow = validateScreen("yellow");

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      log_date: dateResult.ok ? dateResult.value : "",
      shift,
      red_runtime_min: red.runtimeMin,
      red_breakdown_min: red.breakdownMin,
      red_breakdown_reasons: red.reasons,
      yellow_runtime_min: yellow.runtimeMin,
      yellow_breakdown_min: yellow.breakdownMin,
      yellow_breakdown_reasons: yellow.reasons,
    },
  };
}
