// tests/notes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { validateAndNormalizeNote } from "../lib/notes.ts";

test("validateAndNormalizeNote trims surrounding whitespace", () => {
  const result = validateAndNormalizeNote("   Excavation delayed due to rain.   ");
  assert.equal(result.valid, true);
  assert.equal(result.value, "Excavation delayed due to rain.");
  assert.equal(result.error, undefined);
});

test("validateAndNormalizeNote preserves internal formatting and newlines", () => {
  const multiline = "  Line 1\nLine 2\n  Line 3  ";
  const result = validateAndNormalizeNote(multiline);
  assert.equal(result.valid, true);
  assert.equal(result.value, "Line 1\nLine 2\n  Line 3");
});

test("validateAndNormalizeNote rejects empty string", () => {
  const result = validateAndNormalizeNote("");
  assert.equal(result.valid, false);
  assert.equal(result.value, undefined);
  assert.equal(result.error, "Note cannot be empty");
});

test("validateAndNormalizeNote rejects whitespace-only string", () => {
  const result = validateAndNormalizeNote("   \t  \n  ");
  assert.equal(result.valid, false);
  assert.equal(result.value, undefined);
  assert.equal(result.error, "Note cannot be empty");
});

test("validateAndNormalizeNote rejects non-string values", () => {
  assert.equal(validateAndNormalizeNote(null).valid, false);
  assert.equal(validateAndNormalizeNote(undefined).valid, false);
  assert.equal(validateAndNormalizeNote(123).valid, false);
  assert.equal(validateAndNormalizeNote({}).valid, false);
});

test("transformHyphenToBullet converts leading '- ' to '• '", async () => {
  const { transformHyphenToBullet } = await import("../lib/notes.ts");
  assert.equal(transformHyphenToBullet("- Work done"), "• Work done");
  assert.equal(transformHyphenToBullet("Line 1\n- Line 2"), "Line 1\n• Line 2");
  assert.equal(transformHyphenToBullet("  - Indented item"), "  • Indented item");
  // Does not change mid-word or mid-sentence hyphens
  assert.equal(transformHyphenToBullet("bio-mining"), "bio-mining");
  assert.equal(transformHyphenToBullet("rate - 50%"), "rate - 50%");
});

test("handleBulletEnter inserts new bullet on Enter", async () => {
  const { handleBulletEnter } = await import("../lib/notes.ts");
  const text = "• Point 1";
  const result = handleBulletEnter(text, text.length);
  assert.notEqual(result, null);
  assert.equal(result?.text, "• Point 1\n• ");
  assert.equal(result?.cursor, "• Point 1\n• ".length);
});

test("handleBulletEnter clears empty bullet when Enter is pressed", async () => {
  const { handleBulletEnter } = await import("../lib/notes.ts");
  const text = "• ";
  const result = handleBulletEnter(text, text.length);
  assert.notEqual(result, null);
  assert.equal(result?.text, "");
  assert.equal(result?.cursor, 0);
});

test("handleBulletBackspace clears empty bullet", async () => {
  const { handleBulletBackspace } = await import("../lib/notes.ts");
  const text = "• ";
  const result = handleBulletBackspace(text, text.length);
  assert.notEqual(result, null);
  assert.equal(result?.text, "");
  assert.equal(result?.cursor, 0);
});

test("parseNoteLines structures bullet lines, regular text, and empty lines", async () => {
  const { parseNoteLines } = await import("../lib/notes.ts");
  const input = "Header\n• Point A\n- Point B\n\nFooter note";
  const lines = parseNoteLines(input);
  assert.deepEqual(lines, [
    { type: "text", text: "Header" },
    { type: "bullet", text: "Point A" },
    { type: "bullet", text: "Point B" },
    { type: "empty", text: "" },
    { type: "text", text: "Footer note" },
  ]);
});

