// tests/mrf.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateMrfLog,
  normalizePhotoPaths,
  buildPhotoPath,
  validatePhotoType,
  validateCompressedSize,
  MAX_PHOTOS,
} from "../lib/mrf.ts";

const TODAY = "2026-09-20";
const PHOTO = "2026/09/abc.jpg";

test("validateMrfLog accepts a date, trimmed note and photos", () => {
  const result = validateMrfLog(
    { log_date: "2026-09-20", note: "  Belt repaired.  ", photo_paths: [PHOTO] },
    TODAY
  );
  assert.equal(result.valid, true);
  assert.equal(result.value.log_date, "2026-09-20");
  assert.equal(result.value.note, "Belt repaired.");
  assert.deepEqual(result.value.photo_paths, [PHOTO]);
});

test("validateMrfLog rejects an empty note", () => {
  const result = validateMrfLog({ log_date: "2026-09-20", note: "   ", photo_paths: [PHOTO] }, TODAY);
  assert.equal(result.valid, false);
  assert.equal(result.errors.note, "Note cannot be empty");
});

test("validateMrfLog rejects a log with no photos", () => {
  const result = validateMrfLog({ log_date: "2026-09-20", note: "ok", photo_paths: [] }, TODAY);
  assert.equal(result.valid, false);
  assert.equal(result.errors.photo_paths, "Add at least one photo");
});

test("validateMrfLog rejects a missing photo_paths field entirely", () => {
  const result = validateMrfLog({ log_date: "2026-09-20", note: "ok" }, TODAY);
  assert.equal(result.valid, false);
  assert.equal(result.errors.photo_paths, "Add at least one photo");
});

test("validateMrfLog rejects a future date", () => {
  const result = validateMrfLog({ log_date: "2026-12-01", note: "ok", photo_paths: [PHOTO] }, TODAY);
  assert.equal(result.valid, false);
  assert.equal(result.errors.log_date, "Date cannot be in the future");
});

test("validateMrfLog reports date, note and photo errors together", () => {
  const result = validateMrfLog({ log_date: "", note: "", photo_paths: [] }, TODAY);
  assert.equal(result.valid, false);
  assert.equal(result.errors.log_date, "Date is required");
  assert.equal(result.errors.note, "Note cannot be empty");
  assert.equal(result.errors.photo_paths, "Add at least one photo");
});

test("normalizePhotoPaths accepts a single string as well as an array", () => {
  assert.deepEqual(normalizePhotoPaths(PHOTO), { ok: true, value: [PHOTO] });
});

test("normalizePhotoPaths drops blanks and de-duplicates", () => {
  const result = normalizePhotoPaths([PHOTO, "  ", PHOTO, "2026/09/def.png"]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, [PHOTO, "2026/09/def.png"]);
});

test("normalizePhotoPaths rejects traversal and absolute paths", () => {
  assert.equal(normalizePhotoPaths(["../secrets/key.jpg"]).ok, false);
  assert.equal(normalizePhotoPaths(["/etc/passwd"]).ok, false);
});

test("normalizePhotoPaths rejects non-string entries", () => {
  assert.equal(normalizePhotoPaths([42]).ok, false);
});

test("normalizePhotoPaths enforces the 10-photo ceiling", () => {
  const many = Array.from({ length: MAX_PHOTOS + 1 }, (_, i) => `2026/09/${i}.jpg`);
  const result = normalizePhotoPaths(many);
  assert.equal(result.ok, false);
  assert.equal(result.error, "No more than 10 photos");
});

test("buildPhotoPath partitions by the log's year and month", () => {
  assert.equal(buildPhotoPath("2026-09-20", "IMG_1234.JPEG", "uuid-1"), "2026/09/uuid-1.jpeg");
});

test("buildPhotoPath falls back to jpg for an extensionless name", () => {
  assert.equal(buildPhotoPath("2026-01-05", "photo", "uuid-2"), "2026/01/uuid-2.photo");
  assert.equal(buildPhotoPath("2026-01-05", "photo.", "uuid-3"), "2026/01/uuid-3.jpg");
});

test("validatePhotoType accepts camera formats and rejects non-images", () => {
  assert.equal(validatePhotoType({ type: "image/jpeg" }), null);
  assert.equal(validatePhotoType({ type: "image/heic" }), null);
  assert.match(validatePhotoType({ type: "application/pdf" }), /JPEG/);
});

test("validatePhotoType ignores size: a 22MB original is compressed, not rejected", () => {
  // Regression: rejecting big originals up front would force manual
  // compression, which PRD S4 forbids.
  assert.equal(validatePhotoType({ type: "image/jpeg", size: 22 * 1024 * 1024 }), null);
});

test("validateCompressedSize enforces the bucket ceiling on the uploaded file", () => {
  assert.equal(validateCompressedSize(250 * 1024), null);
  assert.match(validateCompressedSize(20 * 1024 * 1024), /too large/);
});
