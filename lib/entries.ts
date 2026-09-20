// lib/entries.ts
// Pure validation + normalization for bio-mining entry form data.
// Kept free of Supabase/Next imports so it can be unit-tested directly.

export const SHIFTS = ["Day", "Night", "Full day"] as const;
export type Shift = (typeof SHIFTS)[number];

/** The 11 disposed-material columns, in the order they appear on the form. */
export const MATERIAL_FIELDS = [
  { key: "soil_mt", label: "SOIL" },
  { key: "rdf_mt", label: "RDF" },
  { key: "stones_mt", label: "STONES" },
  { key: "inert_mt", label: "INERT" },
  { key: "steel_mt", label: "STEEL" },
  { key: "tyre_mt", label: "TYRE" },
  { key: "wood_mt", label: "WOOD" },
  { key: "glass_mt", label: "GLASS" },
  { key: "iron_scrap_mt", label: "IRON SCRAP" },
  { key: "wires_cables_mt", label: "WIRES & CABLES" },
  { key: "others_mt", label: "OTHERS" },
] as const;

export type MaterialKey = (typeof MATERIAL_FIELDS)[number]["key"];

export interface EntryValues {
  report_date: string;
  shift: Shift;
  inward_mt: number;
  remarks: string | null;
  soil_mt: number | null;
  rdf_mt: number | null;
  stones_mt: number | null;
  inert_mt: number | null;
  steel_mt: number | null;
  tyre_mt: number | null;
  wood_mt: number | null;
  glass_mt: number | null;
  iron_scrap_mt: number | null;
  wires_cables_mt: number | null;
  others_mt: number | null;
}

export interface EntryValidationResult {
  valid: boolean;
  value?: EntryValues;
  errors?: Record<string, string>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses an optional tonnage field. Blank means "not recorded" (null), which is
 * distinct from an explicit 0. Mirrors the entries_mt_non_negative constraint.
 */
export function parseOptionalMt(raw: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { ok: false, error: "Must be a number" };
    if (raw < 0) return { ok: false, error: "Cannot be negative" };
    return { ok: true, value: raw };
  }
  if (typeof raw !== "string") return { ok: false, error: "Must be a number" };

  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };

  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, error: "Must be a number" };
  if (n < 0) return { ok: false, error: "Cannot be negative" };
  return { ok: true, value: n };
}

/** Same as parseOptionalMt, but blank is rejected instead of becoming null. */
export function parseRequiredMt(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = parseOptionalMt(raw);
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return { ok: false, error: "Required" };
  return { ok: true, value: parsed.value };
}

/** Validates an ISO date string and rejects dates in the future (UTC day granularity). */
export function validateReportDate(raw: unknown, today: string): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "Date is required" };
  }
  const trimmed = raw.trim();
  if (!DATE_RE.test(trimmed)) return { ok: false, error: "Use YYYY-MM-DD" };

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Not a valid date" };
  // Guard against roll-over like 2026-02-31 silently becoming 2026-03-03.
  if (parsed.toISOString().slice(0, 10) !== trimmed) return { ok: false, error: "Not a valid date" };
  if (trimmed > today) return { ok: false, error: "Date cannot be in the future" };

  return { ok: true, value: trimmed };
}

export function validateShift(raw: unknown): { ok: true; value: Shift } | { ok: false; error: string } {
  if (typeof raw === "string" && (SHIFTS as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as Shift };
  }
  return { ok: false, error: "Select a shift" };
}

/**
 * Validates a whole entry form payload. `today` is injected (rather than read from
 * the clock) so the rule stays deterministic and testable.
 */
export function validateEntry(raw: Record<string, unknown>, today: string): EntryValidationResult {
  const errors: Record<string, string> = {};

  const date = validateReportDate(raw.report_date, today);
  if (!date.ok) errors.report_date = date.error;

  const shift = validateShift(raw.shift);
  if (!shift.ok) errors.shift = shift.error;

  const inward = parseRequiredMt(raw.inward_mt);
  if (!inward.ok) errors.inward_mt = inward.error;

  const materials: Partial<Record<MaterialKey, number | null>> = {};
  for (const field of MATERIAL_FIELDS) {
    const parsed = parseOptionalMt(raw[field.key]);
    if (!parsed.ok) {
      errors[field.key] = parsed.error;
    } else {
      materials[field.key] = parsed.value;
    }
  }

  let remarks: string | null = null;
  if (typeof raw.remarks === "string") {
    const trimmed = raw.remarks.trim();
    remarks = trimmed === "" ? null : trimmed;
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    value: {
      report_date: date.ok ? date.value : "",
      shift: shift.ok ? shift.value : "Day",
      inward_mt: inward.ok ? inward.value : 0,
      remarks,
      soil_mt: materials.soil_mt ?? null,
      rdf_mt: materials.rdf_mt ?? null,
      stones_mt: materials.stones_mt ?? null,
      inert_mt: materials.inert_mt ?? null,
      steel_mt: materials.steel_mt ?? null,
      tyre_mt: materials.tyre_mt ?? null,
      wood_mt: materials.wood_mt ?? null,
      glass_mt: materials.glass_mt ?? null,
      iron_scrap_mt: materials.iron_scrap_mt ?? null,
      wires_cables_mt: materials.wires_cables_mt ?? null,
      others_mt: materials.others_mt ?? null,
    },
  };
}

/** Sums the 11 disposed-material columns, treating blanks as 0. */
export function sumDisposed(values: Partial<Record<MaterialKey, number | null>>): number {
  return MATERIAL_FIELDS.reduce((total, f) => total + (values[f.key] ?? 0), 0);
}
