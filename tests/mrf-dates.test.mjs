// tests/mrf-dates.test.mjs
// Tests for YYMMDD ↔ ISO conversions and extractFirstLine.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import the functions under test.
// We use dynamic import so ESM resolution picks up the .ts via tsx or tsc output.
const { isoToYYMMDD, yymmddToISO, extractFirstLine } = await import("../lib/mrf-dates.ts");

describe("isoToYYMMDD", () => {
  it("converts a normal date", () => {
    assert.equal(isoToYYMMDD("2026-09-20"), "260920");
  });

  it("handles January (leading zero month)", () => {
    assert.equal(isoToYYMMDD("2026-01-05"), "260105");
  });

  it("handles December", () => {
    assert.equal(isoToYYMMDD("2025-12-31"), "251231");
  });

  it("returns empty string for invalid input", () => {
    assert.equal(isoToYYMMDD("not-a-date"), "");
  });
});

describe("yymmddToISO", () => {
  it("converts a normal code", () => {
    assert.equal(yymmddToISO("260920"), "2026-09-20");
  });

  it("round-trips with isoToYYMMDD", () => {
    const dates = ["2026-01-01", "2026-06-15", "2030-12-31", "2025-02-28"];
    for (const d of dates) {
      assert.equal(yymmddToISO(isoToYYMMDD(d)), d, `round-trip failed for ${d}`);
    }
  });

  it("returns null for non-6-digit input", () => {
    assert.equal(yymmddToISO("12345"), null);
    assert.equal(yymmddToISO("1234567"), null);
    assert.equal(yymmddToISO("abcdef"), null);
    assert.equal(yymmddToISO(""), null);
  });

  it("returns null for impossible month", () => {
    assert.equal(yymmddToISO("261301"), null); // month 13
    assert.equal(yymmddToISO("260001"), null); // month 0
  });

  it("returns null for impossible day", () => {
    assert.equal(yymmddToISO("260100"), null); // day 0
    assert.equal(yymmddToISO("260132"), null); // day 32
  });

  it("returns null for impossible date like Feb 30", () => {
    assert.equal(yymmddToISO("260230"), null);
  });

  it("handles leap year Feb 29", () => {
    assert.equal(yymmddToISO("240229"), "2024-02-29");
  });

  it("rejects non-leap year Feb 29", () => {
    assert.equal(yymmddToISO("250229"), null);
  });
});

describe("extractFirstLine", () => {
  it("returns empty string for null/undefined", () => {
    assert.equal(extractFirstLine(null), "");
    assert.equal(extractFirstLine(undefined), "");
    assert.equal(extractFirstLine(""), "");
  });

  it("returns the first non-empty line", () => {
    assert.equal(extractFirstLine("Hello world"), "Hello world");
  });

  it("skips blank leading lines", () => {
    assert.equal(extractFirstLine("\n\nActual content"), "Actual content");
  });

  it("strips bullet markers", () => {
    assert.equal(extractFirstLine("• First bullet"), "First bullet");
    assert.equal(extractFirstLine("- Hyphen bullet"), "Hyphen bullet");
    assert.equal(extractFirstLine("* Star bullet"), "Star bullet");
  });

  it("truncates long lines with ellipsis", () => {
    const long = "A".repeat(100);
    const result = extractFirstLine(long);
    assert.ok(result.endsWith("…"), "should end with ellipsis");
    assert.ok(result.length <= 81, "should be at most 81 chars (80 + ellipsis)");
  });

  it("does not add ellipsis when line fits", () => {
    const short = "Short note about today";
    assert.equal(extractFirstLine(short), short);
    assert.ok(!short.endsWith("…"));
  });

  it("handles bullet + blank lines correctly", () => {
    const note = "\n• First item\n• Second item";
    assert.equal(extractFirstLine(note), "First item");
  });
});
