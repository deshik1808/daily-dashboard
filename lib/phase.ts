// lib/phase.ts
// Pure validation for phase_master edits.
// phase + agency are the natural key (unique (phase, agency)) but are editable,
// so a clash is reported as a friendly error rather than a raw constraint failure.

import { parseRequiredMt } from "./entries.ts";

export const PHASES = ["I", "II", "III"] as const;
export type Phase = (typeof PHASES)[number];

export const AGENCIES = ["Zigma", "Card Box"] as const;
export type Agency = (typeof AGENCIES)[number];

export const PHASE_STATUSES = ["In progress", "Completed"] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export interface PhaseValues {
  phase: Phase;
  agency: Agency;
  order_qty_mt: number;
  status: PhaseStatus;
  current_note: string;
}

export interface PhaseValidationResult {
  valid: boolean;
  value?: PhaseValues;
  errors?: Record<string, string>;
}

export function validatePhase(raw: Record<string, unknown>): PhaseValidationResult {
  const errors: Record<string, string> = {};

  let phase: Phase = "I";
  if (typeof raw.phase === "string" && (PHASES as readonly string[]).includes(raw.phase)) {
    phase = raw.phase as Phase;
  } else {
    errors.phase = "Select a phase";
  }

  let agency: Agency = "Zigma";
  if (typeof raw.agency === "string" && (AGENCIES as readonly string[]).includes(raw.agency)) {
    agency = raw.agency as Agency;
  } else {
    errors.agency = "Select an agency";
  }

  const qty = parseRequiredMt(raw.order_qty_mt);
  if (!qty.ok) {
    errors.order_qty_mt = qty.error;
  } else if (qty.value === 0) {
    // phase_totals divides by order_qty_mt; zero would flatten every percentage.
    errors.order_qty_mt = "Order quantity must be greater than 0";
  }

  let status: PhaseStatus = "In progress";
  if (typeof raw.status === "string" && (PHASE_STATUSES as readonly string[]).includes(raw.status)) {
    status = raw.status as PhaseStatus;
  } else {
    errors.status = "Select a status";
  }

  // current_note is not-null with a '' default, so blank is allowed here.
  const current_note = typeof raw.current_note === "string" ? raw.current_note.trim() : "";

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    value: { phase, agency, order_qty_mt: qty.ok ? qty.value : 0, status, current_note },
  };
}

// Balance (or processing loss) as a % of cumulative inward; null when nothing
// has come in yet, so callers can hide the figure instead of showing 0% or NaN.
export function pctOfInward(part: number | null, inward: number | null): number | null {
  if (!inward) return null;
  return ((part ?? 0) / inward) * 100;
}
