import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDuration,
  summarizeRuntime,
  parseHours,
  parseMinutes,
  validateRuntimeLog,
} from "../lib/runtime.ts";

test("formatDuration formats durations correctly", () => {
  assert.equal(formatDuration(0), "0 m");
  assert.equal(formatDuration(-5), "0 m");
  assert.equal(formatDuration(22), "22 m");
  assert.equal(formatDuration(59), "59 m");
  assert.equal(formatDuration(60), "1 h 00 m");
  assert.equal(formatDuration(570), "9 h 30 m");
  assert.equal(formatDuration(660), "11 h 00 m");
  assert.equal(formatDuration(720), "12 h 00 m");
});

test("parseHours and parseMinutes validation", () => {
  assert.deepEqual(parseHours(""), { ok: true, value: null });
  assert.deepEqual(parseHours(null), { ok: true, value: null });
  assert.deepEqual(parseHours("0"), { ok: true, value: 0 });
  assert.deepEqual(parseHours("12"), { ok: true, value: 12 });
  assert.equal(parseHours("13").ok, false);
  assert.equal(parseHours("-1").ok, false);
  assert.equal(parseHours("1.5").ok, false);
  assert.equal(parseHours("abc").ok, false);

  assert.deepEqual(parseMinutes(""), { ok: true, value: null });
  assert.deepEqual(parseMinutes(null), { ok: true, value: null });
  assert.deepEqual(parseMinutes("0"), { ok: true, value: 0 });
  assert.deepEqual(parseMinutes("59"), { ok: true, value: 59 });
  assert.equal(parseMinutes("60").ok, false);
  assert.equal(parseMinutes("-1").ok, false);
  assert.equal(parseMinutes("2.5").ok, false);
});

test("summarizeRuntime computes rounded averages and handles empty list", () => {
  assert.equal(summarizeRuntime([]), null);
  assert.equal(summarizeRuntime(null), null);

  const rows = [
    {
      log_date: "2026-10-01",
      shift: "Day",
      red_runtime_min: 540, // 9 h
      red_breakdown_min: 30,
      yellow_runtime_min: 600, // 10 h
      yellow_breakdown_min: 15,
    },
    {
      log_date: "2026-10-02",
      shift: "Night",
      red_runtime_min: 570, // 9.5 h
      red_breakdown_min: 15,
      yellow_runtime_min: 580,
      yellow_breakdown_min: 10,
    },
  ];

  const summary = summarizeRuntime(rows);
  assert.ok(summary);
  assert.equal(summary.shifts, 2);
  // Red run: (540 + 570) / 2 = 555
  // Red breakdown: (30 + 15) / 2 = 22.5 -> rounds to 23
  assert.equal(summary.red.avgRunMin, 555);
  assert.equal(summary.red.avgBreakdownMin, 23);

  // Yellow run: (600 + 580) / 2 = 590
  // Yellow breakdown: (15 + 10) / 2 = 12.5 -> rounds to 13
  assert.equal(summary.yellow.avgRunMin, 590);
  assert.equal(summary.yellow.avgBreakdownMin, 13);
});

test("summarizeRuntime skips open shifts and averages yellow only where it exists", () => {
  const rows = [
    {
      log_date: "2026-10-01",
      shift: "Day",
      red_runtime_min: 540,
      red_breakdown_min: 180,
      yellow_runtime_min: 600,
      yellow_breakdown_min: 120,
    },
    {
      log_date: "2026-11-01",
      shift: "Day",
      red_runtime_min: 600,
      red_breakdown_min: 120,
      yellow_runtime_min: null,
      yellow_breakdown_min: null,
    },
    // Open shift: opening reading saved, closing still to come.
    {
      log_date: "2026-11-02",
      shift: "Day",
      red_runtime_min: null,
      red_breakdown_min: null,
    },
  ];

  const summary = summarizeRuntime(rows);
  assert.ok(summary);
  assert.equal(summary.shifts, 2);
  assert.equal(summary.red.avgRunMin, 570);
  assert.equal(summary.red.avgBreakdownMin, 150);
  assert.deepEqual(summary.yellow, { avgRunMin: 600, avgBreakdownMin: 120 });

  // No yellow data anywhere in range -> no yellow summary.
  const redOnly = summarizeRuntime([rows[1]]);
  assert.equal(redOnly.yellow, null);

  // Only open shifts -> nothing to average.
  assert.equal(summarizeRuntime([rows[2]]), null);
});

test("validateRuntimeLog enforces required fields and valid inputs", () => {
  const today = "2026-10-02";

  const validPayload = {
    log_date: "2026-10-01",
    shift: "Day",
    red_runtime_h: "9",
    red_runtime_m: "30",
    red_breakdown_h: "1",
    red_breakdown_m: "15",
    red_breakdown_reasons: "Belt cut 55 min, power cut 20 min",
  };

  const res = validateRuntimeLog(validPayload, today);
  assert.equal(res.valid, true);
  assert.ok(res.value);
  assert.equal(res.value.log_date, "2026-10-01");
  assert.equal(res.value.shift, "Day");
  assert.equal(res.value.red_runtime_min, 570);
  assert.equal(res.value.red_breakdown_min, 75);
  assert.equal(
    res.value.red_breakdown_reasons,
    "Belt cut 55 min, power cut 20 min"
  );
  assert.equal("yellow_runtime_min" in res.value, false);
});

test("validateRuntimeLog enforces the 12 h ceiling per screen", () => {
  const today = "2026-10-02";

  // 11 h runtime + 2 h breakdown = 13 h (> 12 h)
  const overCeilingPayload = {
    log_date: "2026-10-01",
    shift: "Day",
    red_runtime_h: "11",
    red_runtime_m: "0",
    red_breakdown_h: "2",
    red_breakdown_m: "0",
    red_breakdown_reasons: "Motor failure",
  };

  const res = validateRuntimeLog(overCeilingPayload, today);
  assert.equal(res.valid, false);
  assert.equal(
    res.errors?.red_runtime,
    "Runtime + breakdown can't be more than 12 h"
  );
});

test("validateRuntimeLog requires reasons when breakdown > 0", () => {
  const today = "2026-10-02";

  const missingReasonPayload = {
    log_date: "2026-10-01",
    shift: "Day",
    red_runtime_h: "8",
    red_runtime_m: "0",
    red_breakdown_h: "1",
    red_breakdown_m: "0",
    red_breakdown_reasons: "   ",
  };

  const res = validateRuntimeLog(missingReasonPayload, today);
  assert.equal(res.valid, false);
  assert.equal(
    res.errors?.red_breakdown_reasons,
    "Add a reason for the breakdown"
  );
});

test("validateRuntimeLog allows optional reasons when breakdown is 0", () => {
  const today = "2026-10-02";

  const zeroBreakdownWithNote = {
    log_date: "2026-10-01",
    shift: "Day",
    red_runtime_h: "8",
    red_runtime_m: "0",
    red_breakdown_h: "0",
    red_breakdown_m: "0",
    red_breakdown_reasons: "Idle, no material",
  };

  const res = validateRuntimeLog(zeroBreakdownWithNote, today);
  assert.equal(res.valid, true);
  assert.equal(res.value?.red_breakdown_reasons, "Idle, no material");
});

test("validateRuntimeLog rejects future dates", () => {
  const today = "2026-10-02";

  const futurePayload = {
    log_date: "2026-10-03",
    shift: "Day",
    red_runtime_h: "8",
    red_runtime_m: "0",
  };

  const res = validateRuntimeLog(futurePayload, today);
  assert.equal(res.valid, false);
  assert.equal(res.errors?.log_date, "Date cannot be in the future");
});

test("meter mode computes runtime from closing minus opening", () => {
  const base = {
    log_date: "2026-10-01",
    shift: "Day",
    red_mode: "meter",
    red_meter_open: "1000",
    red_meter_close: "1009.5",
    red_breakdown_reasons: "Belt cut",
  };
  const res = validateRuntimeLog(base, "2026-10-02");
  assert.equal(res.valid, true);
  assert.equal(res.value.red_runtime_min, 570);
  assert.equal(res.value.red_breakdown_min, 150);

  const noReason = validateRuntimeLog({ ...base, red_breakdown_reasons: "" }, "2026-10-02");
  assert.equal(noReason.valid, false);
  assert.ok(noReason.errors.red_breakdown_reasons);

  const full = validateRuntimeLog(
    { ...base, red_meter_close: "1012", red_breakdown_reasons: "" },
    "2026-10-02"
  );
  assert.equal(full.valid, true);
  assert.equal(full.value.red_breakdown_min, 0);

  const backwards = validateRuntimeLog({ ...base, red_meter_close: "999" }, "2026-10-02");
  assert.ok(backwards.errors.red_meter_close);

  const tooLong = validateRuntimeLog({ ...base, red_meter_close: "1013" }, "2026-10-02");
  assert.ok(tooLong.errors.red_meter_close);
});

test("validation returns raw meter readings only for meter-mode screens", () => {
  const res = validateRuntimeLog(
    {
      log_date: "2026-10-01",
      shift: "Day",
      red_mode: "meter",
      red_meter_open: "1000",
      red_meter_close: "1012",
    },
    "2026-10-02"
  );
  assert.equal(res.valid, true);
  assert.deepEqual(res.meter, { red_open: 1000, red_close: 1012 });
});

test("meter mode accepts an opening reading alone and leaves the shift open", () => {
  const res = validateRuntimeLog(
    {
      log_date: "2026-10-01",
      shift: "Day",
      red_mode: "meter",
      red_meter_open: "1000.5",
      red_meter_close: "",
      red_breakdown_reasons: "",
    },
    "2026-10-02"
  );
  assert.equal(res.valid, true);
  assert.equal(res.value.red_runtime_min, null);
  assert.equal(res.value.red_breakdown_min, null);
  assert.equal(res.value.red_breakdown_reasons, null);
  assert.deepEqual(res.meter, { red_open: 1000.5, red_close: null });
});

test("meter mode still needs an opening reading, even with a closing one", () => {
  const blank = validateRuntimeLog(
    { log_date: "2026-10-01", shift: "Day", red_mode: "meter", red_meter_open: "" },
    "2026-10-02"
  );
  assert.equal(blank.valid, false);
  assert.equal(blank.errors.red_meter_open, "Enter the opening reading");

  const closeOnly = validateRuntimeLog(
    {
      log_date: "2026-10-01",
      shift: "Day",
      red_mode: "meter",
      red_meter_open: "",
      red_meter_close: "1009",
    },
    "2026-10-02"
  );
  assert.equal(closeOnly.valid, false);
  assert.equal(closeOnly.errors.red_meter_open, "Enter the opening reading");
});

test("completing an open shift with a closing reading computes runtime and breakdown", () => {
  const res = validateRuntimeLog(
    {
      log_date: "2026-10-01",
      shift: "Day",
      red_mode: "meter",
      red_meter_open: "1000",
      red_meter_close: "1010",
      red_breakdown_reasons: "- Belt cut",
    },
    "2026-10-02"
  );
  assert.equal(res.valid, true);
  assert.equal(res.value.red_runtime_min, 600);
  assert.equal(res.value.red_breakdown_min, 120);
  assert.deepEqual(res.meter, { red_open: 1000, red_close: 1010 });
});
