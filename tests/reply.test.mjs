// tests/reply.test.mjs
// Tests for the WhatsApp Reply href builder.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { buildReplyHref } = await import("../lib/reply.ts");

describe("buildReplyHref", () => {
  it("builds a valid wa.me URL", () => {
    const href = buildReplyHref("919876543210", {
      label: "MRF Plant · 20 Sept 2026",
      path: "/mrf/2026-09-20",
    }, "https://is.gd/abc123");

    assert.ok(href.startsWith("https://wa.me/919876543210?text="));
  });

  it("includes the label in the encoded text", () => {
    const href = buildReplyHref("919876543210", {
      label: "MRF Plant · 20 Sept 2026",
      path: "/mrf/2026-09-20",
    }, "https://is.gd/abc123");

    const text = decodeURIComponent(href.split("?text=")[1]);
    assert.ok(text.includes("Re: MRF Plant · 20 Sept 2026"), "should contain label");
  });

  it("includes the URL in the encoded text", () => {
    const href = buildReplyHref("919876543210", {
      label: "Home",
      path: "/",
    }, "https://example.com/");

    const text = decodeURIComponent(href.split("?text=")[1]);
    assert.ok(text.includes("https://example.com/"), "should contain URL");
  });

  it("uses the fallback URL when no short link is available", () => {
    const fallback = "http://localhost:3000/m/260920";
    const href = buildReplyHref("919876543210", {
      label: "MRF Plant · 20 Sept 2026",
      path: "/mrf/2026-09-20",
    }, fallback);

    const text = decodeURIComponent(href.split("?text=")[1]);
    assert.ok(text.includes("/m/260920"), "should contain fallback path");
  });

  it("message body ends with a blank line for easy typing", () => {
    const href = buildReplyHref("919876543210", {
      label: "Test",
      path: "/test",
    }, "https://example.com/test");

    const text = decodeURIComponent(href.split("?text=")[1]);
    assert.ok(text.endsWith("\n\n"), "should end with double newline");
  });
});
