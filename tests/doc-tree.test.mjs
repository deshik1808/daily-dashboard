// tests/doc-tree.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDocTree,
  compareDocNodes,
  countDescendants,
  getDeleteConfirmMessage,
  computeNodeDepth,
} from "../lib/doc-tree.ts";

test("compareDocNodes sorts folders before links", () => {
  const folder = { kind: "folder", title: "Zebra" };
  const link = { kind: "link", title: "Apple" };

  assert.equal(compareDocNodes(folder, link), -1);
  assert.equal(compareDocNodes(link, folder), 1);
});

test("compareDocNodes sorts alphabetically case-insensitive within same kind", () => {
  const f1 = { kind: "folder", title: "approvals" };
  const f2 = { kind: "folder", title: "DRAWINGS" };
  const f3 = { kind: "folder", title: "Drawings" };

  assert.ok(compareDocNodes(f1, f2) < 0); // 'a' before 'D'
  assert.ok(compareDocNodes(f2, f1) > 0);
  assert.equal(compareDocNodes(f2, f3), 0); // case-insensitive equality
});

test("buildDocTree correctly assembles tree from flat rows and sorts properly", () => {
  const flatNodes = [
    { id: "root-2", parent_id: null, kind: "folder", title: "OFFICE", url: null },
    { id: "root-1", parent_id: null, kind: "folder", title: "BIO-MINING PHASE III · ZIGMA", url: null },
    { id: "l-1", parent_id: "root-1", kind: "link", title: "Work Order 2024-25", url: "https://drive.google.com/wo" },
    { id: "f-1", parent_id: "root-1", kind: "folder", title: "DRAWINGS", url: null },
    { id: "f-2", parent_id: "root-1", kind: "folder", title: "APPROVALS", url: null },
    { id: "l-2", parent_id: "f-2", kind: "link", title: "Site Handover Letter", url: "https://drive.google.com/sh" },
    { id: "l-3", parent_id: "f-2", kind: "link", title: "CFO Consent (TSPCB)", url: "https://drive.google.com/cfo" },
  ];

  const tree = buildDocTree(flatNodes);

  // Roots should have 2 folders, sorted alphabetically:
  assert.equal(tree.length, 2);
  assert.equal(tree[0].title, "BIO-MINING PHASE III · ZIGMA");
  assert.equal(tree[0].depth, 1);
  assert.equal(tree[1].title, "OFFICE");
  assert.equal(tree[1].depth, 1);

  // Children of root-1: folders before links (APPROVALS, DRAWINGS, then Work Order)
  const root1Children = tree[0].children;
  assert.equal(root1Children.length, 3);
  assert.equal(root1Children[0].title, "APPROVALS");
  assert.equal(root1Children[0].depth, 2);
  assert.equal(root1Children[1].title, "DRAWINGS");
  assert.equal(root1Children[1].depth, 2);
  assert.equal(root1Children[2].title, "Work Order 2024-25");
  assert.equal(root1Children[2].depth, 2);

  // Children of APPROVALS: CFO Consent before Site Handover Letter
  const approvalsChildren = root1Children[0].children;
  assert.equal(approvalsChildren.length, 2);
  assert.equal(approvalsChildren[0].title, "CFO Consent (TSPCB)");
  assert.equal(approvalsChildren[0].depth, 3);
  assert.equal(approvalsChildren[1].title, "Site Handover Letter");
  assert.equal(approvalsChildren[1].depth, 3);
});

test("buildDocTree prevents orphan rows from vanishing silently", () => {
  const flatNodes = [
    { id: "child-orphan", parent_id: "non-existent-id", kind: "link", title: "Orphan Link", url: "https://drive.google.com/orphan" },
    { id: "root-1", parent_id: null, kind: "folder", title: "Root Folder", url: null },
  ];

  const tree = buildDocTree(flatNodes);
  assert.equal(tree.length, 2);
  // Root Folder (folder) before Orphan Link (link)
  assert.equal(tree[0].title, "Root Folder");
  assert.equal(tree[1].title, "Orphan Link");
  assert.equal(tree[1].depth, 1);
});

test("countDescendants correctly counts nested folders and links", () => {
  const tree = buildDocTree([
    { id: "f-root", parent_id: null, kind: "folder", title: "Root", url: null },
    { id: "f-sub1", parent_id: "f-root", kind: "folder", title: "Sub 1", url: null },
    { id: "f-sub2", parent_id: "f-root", kind: "folder", title: "Sub 2", url: null },
    { id: "l-sub1", parent_id: "f-root", kind: "link", title: "Link in root", url: "https://example.com" },
    { id: "l-deep", parent_id: "f-sub1", kind: "link", title: "Deep link", url: "https://example.com" },
  ]);

  const rootCounts = countDescendants(tree[0]);
  assert.deepEqual(rootCounts, { folders: 2, links: 2 });

  const sub1Counts = countDescendants(tree[0].children[0]); // Sub 1
  assert.deepEqual(sub1Counts, { folders: 0, links: 1 });
});

test("getDeleteConfirmMessage generates correct confirmation strings", () => {
  // 1. Link
  const linkNode = {
    id: "l-1",
    parent_id: null,
    kind: "link",
    title: "Work Order 2024-25",
    url: "https://example.com",
    children: [],
    depth: 1,
  };
  assert.equal(
    getDeleteConfirmMessage(linkNode),
    'Delete "Work Order 2024-25"?'
  );

  // 2. Empty folder
  const emptyFolder = {
    id: "f-1",
    parent_id: null,
    kind: "folder",
    title: "Drawings",
    url: null,
    children: [],
    depth: 1,
  };
  assert.equal(
    getDeleteConfirmMessage(emptyFolder),
    'Delete "Drawings"?'
  );

  // 3. Folder with multiple descendants
  const populatedFolder = {
    id: "f-2",
    parent_id: null,
    kind: "folder",
    title: "Drawings",
    url: null,
    children: [
      {
        id: "f-sub1",
        parent_id: "f-2",
        kind: "folder",
        title: "Sub 1",
        url: null,
        depth: 2,
        children: Array.from({ length: 9 }, (_, i) => ({
          id: `link-${i}`,
          parent_id: "f-sub1",
          kind: "link",
          title: `Link ${i}`,
          url: "https://example.com",
          depth: 3,
          children: [],
        })),
      },
      {
        id: "f-sub2",
        parent_id: "f-2",
        kind: "folder",
        title: "Sub 2",
        url: null,
        depth: 2,
        children: [],
      },
    ],
    depth: 1,
  };
  assert.equal(
    getDeleteConfirmMessage(populatedFolder),
    'Delete "Drawings" and everything inside it? 2 folders and 9 links.'
  );

  // 4. Singular cases
  const singularFolder = {
    id: "f-3",
    parent_id: null,
    kind: "folder",
    title: "Approvals",
    url: null,
    children: [
      {
        id: "f-sub",
        parent_id: "f-3",
        kind: "folder",
        title: "Sub",
        url: null,
        depth: 2,
        children: [],
      },
      {
        id: "l-sub",
        parent_id: "f-3",
        kind: "link",
        title: "Link",
        url: "https://example.com",
        depth: 2,
        children: [],
      },
    ],
    depth: 1,
  };
  assert.equal(
    getDeleteConfirmMessage(singularFolder),
    'Delete "Approvals" and everything inside it? 1 folder and 1 link.'
  );
});

test("computeNodeDepth computes correct depth and respects max 5 levels", () => {
  const map = new Map();
  map.set("l1", { id: "l1", parent_id: null });
  map.set("l2", { id: "l2", parent_id: "l1" });
  map.set("l3", { id: "l3", parent_id: "l2" });
  map.set("l4", { id: "l4", parent_id: "l3" });
  map.set("l5", { id: "l5", parent_id: "l4" });

  assert.equal(computeNodeDepth(null, map), 1); // root
  assert.equal(computeNodeDepth("l1", map), 2);
  assert.equal(computeNodeDepth("l2", map), 3);
  assert.equal(computeNodeDepth("l3", map), 4);
  assert.equal(computeNodeDepth("l4", map), 5);
  assert.equal(computeNodeDepth("l5", map), 6); // exceeds 5
});
