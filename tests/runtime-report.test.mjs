import test from "node:test";
import assert from "node:assert/strict";
import {
  validateReportRange,
  buildReportRows,
  formatReportDate,
  pdfSafeText,
  reportFileName,
} from "../lib/runtime-report.ts";

const TODAY = "2026-11-05";

test("validateReportRange accepts a normal period", () => {
  assert.deepEqual(validateReportRange("2026-10-01", "2026-10-31", TODAY), {
    ok: true,
    from: "2026-10-01",
    to: "2026-10-31",
  });
  // A single day is fine.
  assert.equal(validateReportRange("2026-11-05", "2026-11-05", TODAY).ok, true);
});

test("validateReportRange rejects bad, reversed, future and over-long periods", () => {
  const missing = validateReportRange("", "2026-10-31", TODAY);
  assert.equal(missing.ok, false);
  assert.match(missing.error, /^From:/);

  const badTo = validateReportRange("2026-10-01", "2026-02-31", TODAY);
  assert.equal(badTo.ok, false);
  assert.match(badTo.error, /^To:/);

  const reversed = validateReportRange("2026-10-31", "2026-10-01", TODAY);
  assert.equal(reversed.ok, false);
  assert.match(reversed.error, /after/);

  const future = validateReportRange("2026-10-01", "2026-11-06", TODAY);
  assert.equal(future.ok, false);
  assert.match(future.error, /future/);

  const tooLong = validateReportRange("2025-01-01", "2026-11-05", TODAY);
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /one year/);
});

test("formatReportDate formats from the string", () => {
  assert.equal(formatReportDate("2026-10-02"), "02 Oct 2026");
  assert.equal(formatReportDate("2026-01-31"), "31 Jan 2026");
});

const logs = [
  {
    id: "c",
    log_date: "2026-10-02",
    shift: "Night",
    red_runtime_min: 600,
    red_breakdown_min: 120,
    red_breakdown_reasons: "- Belt cut\n- Power cut",
  },
  {
    id: "a",
    log_date: "2026-10-02",
    shift: "Day",
    red_runtime_min: 570,
    red_breakdown_min: 0,
    red_breakdown_reasons: null,
    yellow_runtime_min: 540,
    yellow_breakdown_min: 180,
    yellow_breakdown_reasons: "Idle",
  },
  {
    id: "b",
    log_date: "2026-10-01",
    shift: "Day",
    red_runtime_min: null, // open shift
    red_breakdown_min: null,
  },
  { id: "old", log_date: "2026-09-01", shift: "Day", red_runtime_min: 60, red_breakdown_min: 0 },
  { id: "late", log_date: "2026-11-01", shift: "Day", red_runtime_min: 60, red_breakdown_min: 0 },
];

const meter = {
  a: { red_open: 1000, red_close: 1009.5, yellow_open: 2000, yellow_close: 2009 },
  b: { red_open: 1100.5, red_close: null, yellow_open: null, yellow_close: null },
};

test("buildReportRows filters to the period and sorts oldest first, Day before Night", () => {
  const rows = buildReportRows(logs, meter, "2026-10-01", "2026-10-31");
  assert.deepEqual(
    rows.map((r) => [r.date, r.shift, r.screen]),
    [
      ["01 Oct 2026", "Day", "Red"],
      ["02 Oct 2026", "Day", "Red"],
      ["", "", "Yellow"],
      ["02 Oct 2026", "Night", "Red"],
    ]
  );
});

test("buildReportRows groups a shift's Red and Yellow rows together", () => {
  const rows = buildReportRows(logs, meter, "2026-10-01", "2026-10-31");
  assert.deepEqual(
    rows.map((r) => r.group),
    [0, 1, 1, 2]
  );
});

test("buildReportRows formats runtime, breakdown, meter and reasons", () => {
  const rows = buildReportRows(logs, meter, "2026-10-01", "2026-10-31");
  const [open, red, yellow, night] = rows;

  // Open shift: opening reading only, no figures yet.
  assert.equal(open.runtime, "Awaiting closing");
  assert.equal(open.breakdown, "—");
  assert.equal(open.meter, "1100.5 to —");

  assert.equal(red.runtime, "9 h 30 m");
  assert.equal(red.breakdown, "—");
  assert.equal(red.meter, "1000 to 1009.5");

  assert.equal(yellow.runtime, "9 h 00 m");
  assert.equal(yellow.breakdown, "3 h 00 m");
  assert.equal(yellow.meter, "2000 to 2009");
  assert.equal(yellow.reasons, "Idle");

  // No meter row at all (manual entry).
  assert.equal(night.meter, "—");
  assert.equal(night.runtime, "10 h 00 m");
  assert.equal(night.breakdown, "2 h 00 m");
  assert.equal(night.reasons, "- Belt cut\n- Power cut");
});

test("buildReportRows returns no rows for an empty period", () => {
  assert.deepEqual(buildReportRows(logs, meter, "2026-12-01", "2026-12-31"), []);
  assert.deepEqual(buildReportRows([], {}, "2026-10-01", "2026-10-31"), []);
});

test("pdfSafeText keeps drawable characters and replaces the rest", () => {
  assert.equal(pdfSafeText("Belt cut 55 min"), "Belt cut 55 min");
  assert.equal(pdfSafeText("- one\n- two"), "• one\n• two");
  assert.equal(pdfSafeText("café – “ok”"), "café – “ok”");
  // Telugu and an arrow are not in the built-in font.
  assert.equal(pdfSafeText("తెలు →"), "???? ?");
  assert.equal(pdfSafeText("a\tb\r\nc"), "a b\nc");
});

test("reportFileName builds a safe file name", () => {
  assert.equal(
    reportFileName("Card Box", "2026-10-01", "2026-10-31"),
    "Screen-Runtime-Card-Box-2026-10-01-to-2026-10-31.pdf"
  );
});
