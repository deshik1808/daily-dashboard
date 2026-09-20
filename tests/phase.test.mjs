// tests/phase.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { validatePhase } from "../lib/phase.ts";

const BASE = { phase: "III", agency: "Zigma", order_qty_mt: "10", status: "Completed" };

test("validatePhase accepts a valid payload", () => {
  const result = validatePhase({
    ...BASE,
    order_qty_mt: "50000",
    status: "In progress",
    current_note: "  on track  ",
  });
  assert.equal(result.valid, true);
  assert.equal(result.value.order_qty_mt, 50000);
  assert.equal(result.value.status, "In progress");
  assert.equal(result.value.current_note, "on track");
});

test("validatePhase allows a blank note", () => {
  const result = validatePhase({ ...BASE, current_note: "" });
  assert.equal(result.valid, true);
  assert.equal(result.value.current_note, "");
});

test("validatePhase rejects a zero order quantity to protect pct_of_order", () => {
  const result = validatePhase({ ...BASE, order_qty_mt: "0" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.order_qty_mt, "Order quantity must be greater than 0");
});

test("validatePhase rejects a negative order quantity", () => {
  const result = validatePhase({ ...BASE, order_qty_mt: "-3" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.order_qty_mt, "Cannot be negative");
});

test("validatePhase rejects an unknown status", () => {
  const result = validatePhase({ ...BASE, status: "Paused" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.status, "Select a status");
});

test("validatePhase accepts and returns the phase/agency identity fields", () => {
  const result = validatePhase({ ...BASE, phase: "II", agency: "Card Box" });
  assert.equal(result.valid, true);
  assert.equal(result.value.phase, "II");
  assert.equal(result.value.agency, "Card Box");
});

test("validatePhase rejects a phase outside phase_enum", () => {
  const result = validatePhase({ ...BASE, phase: "IV" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.phase, "Select a phase");
});

test("validatePhase rejects an agency outside agency_enum", () => {
  const result = validatePhase({ ...BASE, agency: "Acme" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.agency, "Select an agency");
});

test("validatePhase requires phase and agency to be present", () => {
  const result = validatePhase({ order_qty_mt: "10", status: "Completed" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.phase, "Select a phase");
  assert.equal(result.errors.agency, "Select an agency");
});
