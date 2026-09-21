// tests/short-links.test.mjs
// Tests for the short-link minting guard.
//
// Regression: `.env.local` points a local Editor at the production Supabase,
// so minting from `next dev` would cache an is.gd link to http://localhost:3000
// under a path every Viewer reads — poisoning the shared cache from one dev
// page view.
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const { getOrCreateShortLink } = await import("../lib/short-links.ts");

const KEYS = ["APP_ORIGIN", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function setEnv(values) {
  for (const key of KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

/** Minimal Supabase stub: always a cache miss, and records any write. */
function stubSupabase() {
  const writes = [];
  return {
    writes,
    from() {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        upsert(row) {
          writes.push(row);
          return { select: () => ({ maybeSingle: async () => ({ data: row }) }) };
        },
      };
    },
  };
}

let originalFetch;
let fetchCalls;

beforeEach(() => {
  fetchCalls = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    return { ok: true, text: async () => "https://is.gd/stub01" };
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  setEnv(saved);
});

describe("getOrCreateShortLink", () => {
  it("does not mint or cache when the origin is localhost", async () => {
    setEnv({});
    const supabase = stubSupabase();
    const result = await getOrCreateShortLink(supabase, "/phase/abc");

    assert.equal(result, null, "should return null so the caller falls back");
    assert.deepEqual(fetchCalls, [], "should not call is.gd at all");
    assert.deepEqual(supabase.writes, [], "should not write a localhost URL to the cache");
  });

  it("does not mint when APP_ORIGIN is explicitly a local address", async () => {
    setEnv({ APP_ORIGIN: "http://127.0.0.1:3000" });
    const supabase = stubSupabase();

    assert.equal(await getOrCreateShortLink(supabase, "/mrf/2026-09-20"), null);
    assert.deepEqual(supabase.writes, []);
  });

  it("mints against the production alias and caches the result", async () => {
    setEnv({ VERCEL_PROJECT_PRODUCTION_URL: "daily-dashboard-silk.vercel.app" });
    const supabase = stubSupabase();
    const result = await getOrCreateShortLink(supabase, "/phase/abc");

    assert.equal(result, "https://is.gd/stub01");
    assert.equal(fetchCalls.length, 1);
    assert.match(
      fetchCalls[0],
      /url=https%3A%2F%2Fdaily-dashboard-silk\.vercel\.app%2Fphase%2Fabc/,
      "should shorten the production alias, not the per-deployment host"
    );
    assert.deepEqual(supabase.writes, [
      { path: "/phase/abc", short_url: "https://is.gd/stub01" },
    ]);
  });

  it("returns a cached row without calling is.gd", async () => {
    setEnv({ VERCEL_PROJECT_PRODUCTION_URL: "daily-dashboard-silk.vercel.app" });
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { short_url: "https://is.gd/cached" } }) }),
        }),
      }),
    };

    assert.equal(await getOrCreateShortLink(supabase, "/phase/abc"), "https://is.gd/cached");
    assert.deepEqual(fetchCalls, []);
  });

  it("returns null without caching when is.gd rejects the request", async () => {
    setEnv({ VERCEL_PROJECT_PRODUCTION_URL: "daily-dashboard-silk.vercel.app" });
    globalThis.fetch = async () => ({ ok: false, status: 502, text: async () => "error" });
    const supabase = stubSupabase();

    assert.equal(await getOrCreateShortLink(supabase, "/phase/abc"), null);
    assert.deepEqual(supabase.writes, []);
  });
});
