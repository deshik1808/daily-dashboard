// tests/app-origin.test.mjs
// Tests for the origin every shared link is built from.
//
// Regression: links sent to WhatsApp pointed at VERCEL_URL — the per-deployment
// host, which is both long and behind Deployment Protection, so recipients hit
// a Vercel login wall instead of the dashboard.
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

const { getAppOrigin } = await import("../lib/app-origin.ts");

const KEYS = ["APP_ORIGIN", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function setEnv(values) {
  for (const key of KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

afterEach(() => setEnv(saved));

describe("getAppOrigin", () => {
  it("prefers an explicit APP_ORIGIN", () => {
    setEnv({
      APP_ORIGIN: "https://tpt-logs.example",
      VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app",
      VERCEL_URL: "deployment-abc123.vercel.app",
    });
    assert.equal(getAppOrigin(), "https://tpt-logs.example");
  });

  it("treats an empty or whitespace APP_ORIGIN as unset", () => {
    setEnv({ APP_ORIGIN: "   ", VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app" });
    assert.equal(getAppOrigin(), "https://prod.vercel.app");
  });

  it("uses the production alias over the per-deployment host", () => {
    setEnv({
      VERCEL_PROJECT_PRODUCTION_URL: "daily-dashboard-silk.vercel.app",
      VERCEL_URL: "daily-dashboard-e7bx8es7g-deshik1808s-projects.vercel.app",
    });
    assert.equal(getAppOrigin(), "https://daily-dashboard-silk.vercel.app");
  });

  it("falls back to the per-deployment host on previews", () => {
    setEnv({ VERCEL_URL: "daily-dashboard-git-branch.vercel.app" });
    assert.equal(getAppOrigin(), "https://daily-dashboard-git-branch.vercel.app");
  });

  it("falls back to localhost when nothing is set", () => {
    setEnv({});
    assert.equal(getAppOrigin(), "http://localhost:3000");
  });

  it("never returns a bare host without a scheme", () => {
    setEnv({ VERCEL_PROJECT_PRODUCTION_URL: "daily-dashboard-silk.vercel.app" });
    assert.match(getAppOrigin(), /^https?:\/\//);
  });
});
