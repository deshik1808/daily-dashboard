// tests/entries.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseOptionalMt,
  parseRequiredMt,
  validateReportDate,
  validateShift,
  validateEntry,
  sumDisposed,
  MATERIAL_FIELDS,
} from "../lib/entries.ts";

const TODAY = "2026-09-20";

function validRaw(overrides = {}) {
  return {
    report_date: "2026-09-19",
    shift: "Full day",
    inward_mt: "120.5",
    ...overrides,
  };
}

test("parseOptionalMt treats blank as not-recorded (null)", () => {
  assert.deepEqual(parseOptionalMt(""), { ok: true, value: null });
  assert.deepEqual(parseOptionalMt("   "), { ok: true, value: null });
  assert.deepEqual(parseOptionalMt(null), { ok: true, value: null });
});

test("parseOptionalMt distinguishes explicit zero from blank", () => {
  assert.deepEqual(parseOptionalMt("0"), { ok: true, value: 0 });
});

test("parseOptionalMt rejects negatives and non-numbers", () => {
  assert.equal(parseOptionalMt("-1").ok, false);
  assert.equal(parseOptionalMt("abc").ok, false);
  assert.equal(parseOptionalMt("Infinity").ok, false);
});

test("parseRequiredMt rejects blank but accepts zero", () => {
  assert.equal(parseRequiredMt("").ok, false);
  assert.deepEqual(parseRequiredMt("0"), { ok: true, value: 0 });
});

test("validateReportDate accepts today and past, rejects future", () => {
  assert.equal(validateReportDate(TODAY, TODAY).ok, true);
  assert.equal(validateReportDate("2026-01-01", TODAY).ok, true);
  const future = validateReportDate("2026-09-21", TODAY);
  assert.equal(future.ok, false);
  assert.equal(future.error, "Date cannot be in the future");
});

test("validateReportDate rejects malformed and rolled-over dates", () => {
  assert.equal(validateReportDate("20-09-2026", TODAY).ok, false);
  assert.equal(validateReportDate("2026-02-31", TODAY).ok, false);
  assert.equal(validateReportDate("", TODAY).ok, false);
});

test("validateShift accepts only the shift_enum values", () => {
  assert.equal(validateShift("Day").ok, true);
  assert.equal(validateShift("Night").ok, true);
  assert.equal(validateShift("Full day").ok, true);
  assert.equal(validateShift("Evening").ok, false);
  assert.equal(validateShift(undefined).ok, false);
});

test("validateEntry accepts a minimal valid payload and nulls blank materials", () => {
  const result = validateEntry(validRaw(), TODAY);
  assert.equal(result.valid, true);
  assert.equal(result.value.inward_mt, 120.5);
  assert.equal(result.value.report_date, "2026-09-19");
  assert.equal(result.value.shift, "Full day");
  for (const f of MATERIAL_FIELDS) {
    assert.equal(result.value[f.key], null, `${f.key} should default to null`);
  }
});

test("validateEntry parses material columns and trims remarks", () => {
  const result = validateEntry(
    validRaw({ soil_mt: "40", rdf_mt: "12.25", remarks: "  rain delay  " }),
    TODAY
  );
  assert.equal(result.valid, true);
  assert.equal(result.value.soil_mt, 40);
  assert.equal(result.value.rdf_mt, 12.25);
  assert.equal(result.value.remarks, "rain delay");
});

test("validateEntry turns a blank remark into null", () => {
  const result = validateEntry(validRaw({ remarks: "   " }), TODAY);
  assert.equal(result.value.remarks, null);
});

test("validateEntry collects every field error at once", () => {
  const result = validateEntry(
    { report_date: "", shift: "Morning", inward_mt: "-5", soil_mt: "abc" },
    TODAY
  );
  assert.equal(result.valid, false);
  assert.equal(result.errors.report_date, "Date is required");
  assert.equal(result.errors.shift, "Select a shift");
  assert.equal(result.errors.inward_mt, "Cannot be negative");
  assert.equal(result.errors.soil_mt, "Must be a number");
  assert.equal(result.value, undefined);
});

test("sumDisposed treats blanks as zero", () => {
  assert.equal(sumDisposed({ soil_mt: 10, rdf_mt: 5, stones_mt: null }), 15);
  assert.equal(sumDisposed({}), 0);
});
