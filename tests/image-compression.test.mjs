// tests/image-compression.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeTargetDimensions,
  nextFallbackWidth,
  needsCompression,
  replaceExtension,
  MAX_PHOTO_WIDTH,
  TARGET_PHOTO_BYTES,
} from "../lib/image-compression.ts";

test("computeTargetDimensions caps width at 1600px preserving aspect ratio", () => {
  assert.deepEqual(computeTargetDimensions(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(computeTargetDimensions(3000, 4000), { width: 1600, height: 2133 });
});

test("computeTargetDimensions never upscales a smaller image", () => {
  assert.deepEqual(computeTargetDimensions(800, 600), { width: 800, height: 600 });
  assert.deepEqual(computeTargetDimensions(MAX_PHOTO_WIDTH, 900), {
    width: MAX_PHOTO_WIDTH,
    height: 900,
  });
});

test("computeTargetDimensions is defensive about bad input", () => {
  assert.deepEqual(computeTargetDimensions(0, 100), { width: 0, height: 0 });
  assert.deepEqual(computeTargetDimensions(NaN, 100), { width: 0, height: 0 });
});

test("computeTargetDimensions keeps height at least 1px for extreme panoramas", () => {
  const result = computeTargetDimensions(16000, 5);
  assert.equal(result.width, 1600);
  assert.ok(result.height >= 1);
});

test("nextFallbackWidth steps down by 25% until it hits the floor", () => {
  assert.equal(nextFallbackWidth(1600), 1200);
  assert.equal(nextFallbackWidth(1200), 900);
  assert.equal(nextFallbackWidth(900), 675);
  assert.equal(nextFallbackWidth(675), null);
});

test("needsCompression triggers on size OR width", () => {
  assert.equal(needsCompression(TARGET_PHOTO_BYTES + 1, 800), true);
  assert.equal(needsCompression(1000, MAX_PHOTO_WIDTH + 1), true);
  assert.equal(needsCompression(TARGET_PHOTO_BYTES, MAX_PHOTO_WIDTH), false);
  assert.equal(needsCompression(1000, 800), false);
});

test("replaceExtension rewrites to .jpg and tolerates odd names", () => {
  assert.equal(replaceExtension("IMG_1234.HEIC"), "IMG_1234.jpg");
  assert.equal(replaceExtension("photo"), "photo.jpg");
  assert.equal(replaceExtension("my.photo.v2.png"), "my.photo.v2.jpg");
});
