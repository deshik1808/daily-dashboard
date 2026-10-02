import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRole,
  decideAccess,
  canWriteAgency,
  canEditRecord,
} from "../lib/access.ts";

test("parseRole handles valid, missing, and invalid roles", () => {
  assert.deepEqual(parseRole(null), { role: null, agency: null });
  assert.deepEqual(parseRole(undefined), { role: null, agency: null });
  assert.deepEqual(parseRole({}), { role: null, agency: null });
  assert.deepEqual(parseRole({ app_role: "random" }), {
    role: null,
    agency: null,
  });

  // Editor and Viewer
  assert.deepEqual(parseRole({ app_role: "editor" }), {
    role: "editor",
    agency: null,
  });
  assert.deepEqual(parseRole({ app_role: "viewer" }), {
    role: "viewer",
    agency: null,
  });

  // Operator without agency is treated as no role
  assert.deepEqual(parseRole({ app_role: "operator" }), {
    role: null,
    agency: null,
  });
  assert.deepEqual(parseRole({ app_role: "operator", agency: "" }), {
    role: null,
    agency: null,
  });
  assert.deepEqual(parseRole({ app_role: "operator", agency: "   " }), {
    role: null,
    agency: null,
  });

  // Operator with agency
  assert.deepEqual(
    parseRole({ app_role: "operator", agency: "Card Box" }),
    { role: "operator", agency: "Card Box" }
  );
});

test("decideAccess for signed-out visitor", () => {
  // Always allowed
  assert.deepEqual(decideAccess("/login", "", null), { allow: true });
  assert.deepEqual(decideAccess("/api/push", "", null), { allow: true });
  assert.deepEqual(decideAccess("/api/push/test", "", null), { allow: true });

  // Redirects with next
  assert.deepEqual(decideAccess("/", "", null), {
    allow: false,
    redirect: "/login?next=%2F",
  });
  assert.deepEqual(decideAccess("/phase/x", "", null), {
    allow: false,
    redirect: "/login?next=%2Fphase%2Fx",
  });
  assert.deepEqual(decideAccess("/phase/x", "?range=all", null), {
    allow: false,
    redirect: "/login?next=%2Fphase%2Fx%3Frange%3Dall",
  });
  assert.deepEqual(decideAccess("/entry/new", "?phase=x", null), {
    allow: false,
    redirect: "/login?next=%2Fentry%2Fnew%3Fphase%3Dx",
  });
});

test("decideAccess for session without role", () => {
  const sessionNoRole = { userId: "user-1", role: null, agency: null };

  assert.deepEqual(decideAccess("/login", "", sessionNoRole), { allow: true });
  assert.deepEqual(decideAccess("/api/push", "", sessionNoRole), { allow: true });
  assert.deepEqual(decideAccess("/", "", sessionNoRole), {
    allow: false,
    redirect: "/login",
  });
  assert.deepEqual(decideAccess("/phase/x", "", sessionNoRole), {
    allow: false,
    redirect: "/login",
  });
});

test("decideAccess for Editor", () => {
  const editor = { userId: "deshik", role: "editor", agency: null };
  const paths = [
    "/",
    "/login",
    "/api/push",
    "/phase/x",
    "/phase/x/edit",
    "/phase/x/runtime",
    "/entry/new",
    "/runtime/new",
    "/mrf",
    "/mrf/new",
    "/mrf/edit/123",
    "/doc-bank",
    "/p/1z",
    "/m/261002",
  ];

  for (const path of paths) {
    assert.deepEqual(decideAccess(path, "", editor), { allow: true });
  }
});

test("decideAccess for Viewer", () => {
  const viewer = { userId: "superior", role: "viewer", agency: null };

  // Allowed pages
  assert.deepEqual(decideAccess("/", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/login", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/api/push", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/phase/x", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/phase/x/runtime", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/mrf", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/doc-bank", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/p/1z", "", viewer), { allow: true });
  assert.deepEqual(decideAccess("/m/261002", "", viewer), { allow: true });

  // Editor-only pages redirect to /
  assert.deepEqual(decideAccess("/entry/new", "", viewer), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/entry/123", "", viewer), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/runtime/new", "", viewer), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/runtime/123", "", viewer), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/mrf/new", "", viewer), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/mrf/edit/123", "", viewer), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/phase/x/edit", "", viewer), {
    allow: false,
    redirect: "/",
  });
});

test("decideAccess for Operator", () => {
  const operator = { userId: "op-1", role: "operator", agency: "Card Box" };

  // Allowed pages
  assert.deepEqual(decideAccess("/", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/login", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/api/push", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/phase/x", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/phase/x/runtime", "", operator), {
    allow: true,
  });
  assert.deepEqual(decideAccess("/entry/new", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/entry/123", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/runtime/new", "", operator), { allow: true });
  assert.deepEqual(decideAccess("/runtime/123", "", operator), { allow: true });

  // Disallowed pages redirect to /
  assert.deepEqual(decideAccess("/phase/x/edit", "", operator), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/mrf", "", operator), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/mrf/new", "", operator), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/doc-bank", "", operator), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/p/1z", "", operator), {
    allow: false,
    redirect: "/",
  });
  assert.deepEqual(decideAccess("/m/261002", "", operator), {
    allow: false,
    redirect: "/",
  });
});

test("canWriteAgency permissions", () => {
  const editor = { role: "editor", agency: null };
  const operatorCardBox = { role: "operator", agency: "Card Box" };
  const viewer = { role: "viewer", agency: null };

  assert.equal(canWriteAgency(editor, "Card Box"), true);
  assert.equal(canWriteAgency(editor, "Zigma"), true);

  assert.equal(canWriteAgency(operatorCardBox, "Card Box"), true);
  assert.equal(canWriteAgency(operatorCardBox, "Zigma"), false);

  assert.equal(canWriteAgency(viewer, "Card Box"), false);
  assert.equal(canWriteAgency(null, "Card Box"), false);
});

test("canEditRecord permissions", () => {
  const editor = { userId: "ed-1", role: "editor", agency: null };
  const operator = { userId: "op-1", role: "operator", agency: "Card Box" };
  const viewer = { userId: "vw-1", role: "viewer", agency: null };

  const ownRecord = { agency: "Card Box", created_by: "op-1" };
  const otherRecordSameAgency = { agency: "Card Box", created_by: "ed-1" };
  const otherAgencyRecord = { agency: "Zigma", created_by: "op-1" };

  // Editor can edit all
  assert.equal(canEditRecord(editor, ownRecord), true);
  assert.equal(canEditRecord(editor, otherRecordSameAgency), true);
  assert.equal(canEditRecord(editor, otherAgencyRecord), true);

  // Operator can only edit own record in own agency
  assert.equal(canEditRecord(operator, ownRecord), true);
  assert.equal(canEditRecord(operator, otherRecordSameAgency), false);
  assert.equal(canEditRecord(operator, otherAgencyRecord), false);

  // Viewer can edit none
  assert.equal(canEditRecord(viewer, ownRecord), false);
  assert.equal(canEditRecord(null, ownRecord), false);
});
