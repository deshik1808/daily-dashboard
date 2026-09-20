# Doc Bank — Design

**Date:** 2026-09-20
**Status:** Approved (design); implementation not started

## Problem

Project documents — work orders, drawings, approvals, DPRs, bills, correspondence — live
scattered across Google Drive with no agreed structure. When a superior asks for a document,
finding it means hunting through Drive. Nothing in the dashboard points at them.

## Goal

A second screen in the dashboard, reachable from the bottom nav, holding a free-form tree of
folders and Google Drive links. The editor builds and maintains the tree; the signed-out
viewer browses it and opens documents in Drive.

Out of scope for v1: search, drag-reorder, moving nodes between folders, file uploads,
linking documents to specific phases, and any restore-from-trash screen.

## Data model

Single table `doc_nodes` (adjacency list) holding both folders and links. A folder and a link
share the same shape — a named thing inside another thing — so one table keeps the whole tree
to a single query.

```sql
create type doc_node_kind as enum ('folder', 'link');

create table doc_nodes (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references doc_nodes(id) on delete cascade,
  kind        doc_node_kind not null,
  title       text not null,
  url         text,
  created_by  uuid not null default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint doc_nodes_title_length
    check (char_length(btrim(title)) between 1 and 120),
  constraint doc_nodes_url_shape
    check (
      (kind = 'folder' and url is null) or
      (kind = 'link'   and url ~ '^https://')
    )
);

create unique index doc_nodes_unique_name_in_parent
  on doc_nodes (parent_id, lower(btrim(title)))
  nulls not distinct;

create trigger doc_nodes_set_updated_at before update on doc_nodes
  for each row execute function set_updated_at();
```

Notes:

- `parent_id is null` means a top-level folder or link.
- `nulls not distinct` is required so the uniqueness rule also applies at the top level
  (Postgres otherwise treats every `null` parent as distinct). Supabase runs PG15+.
- The `^https://` check is a security control, not cosmetics: a user-supplied string rendered
  as an `href` is how `javascript:` URLs get in. It is enforced in the database so a bug in a
  form or action cannot bypass it.
- Max depth of 5 levels is enforced in the server action (walking `parent_id` upward), not as
  a constraint. Deeper nesting is unreadable on a phone.
- No `sort_order` column. Ordering is derived: folders before links, each alphabetical by
  title, case-insensitive.

### RLS

Read is public; all writes require an authenticated session. This is the first table in the
app needing a DELETE policy.

```sql
alter table doc_nodes enable row level security;

create policy doc_nodes_select on doc_nodes
  for select using (true);
create policy doc_nodes_insert on doc_nodes
  for insert to authenticated with check (created_by = auth.uid());
create policy doc_nodes_update on doc_nodes
  for update to authenticated using (true) with check (true);
create policy doc_nodes_delete on doc_nodes
  for delete to authenticated using (true);
```

Migration file: `supabase/migrations/0006_doc_nodes.sql` (0005 is taken by the in-flight
project-notes work). `lib/supabase/database.types.ts`
must be regenerated to include the new table and enum.

## Screens

### Bottom nav

`BottomNav`'s `active` prop widens from `"home"` to `"home" | "doc-bank"`. Two equal-width
links, same 1-bit treatment as today — active filled (`bg-ink text-paper`), inactive plain.

```
+--------------+--------------+
|     HOME     |   DOC BANK   |
+--------------+--------------+
```

### `/doc-bank`

Server component. One query — `select * from doc_nodes` — assembled into a tree in memory, so
expanding a folder costs nothing and there is no loading state mid-tree. Passes the tree and
`isEditor` (from `supabase.auth.getUser()`) to a client component.

Browse view:

```
DOC BANK

v BIO-MINING PHASE III · ZIGMA
   > DRAWINGS
   v APPROVALS
      -> CFO Consent (TSPCB)
      -> Site Handover Letter
   -> Work Order 2024-25
> MRF PLANT · RAGHURAM HUME
> OFFICE
-------------------------------
     HOME     |   DOC BANK
```

- Folders collapsed on load; expansion state held in component state for the visit only.
- Triangle markers for folders, an arrow for links.
- Link titles render in accent blue and underlined, `target="_blank"`,
  `rel="noopener noreferrer"`.
- Rows are full-width, minimum 44px tall.
- Indent is 12px per level and **stops increasing after level 3**, so a level-5 row still fits
  a 390px screen. Depth past 3 is conveyed by the disclosure marker alone.
- Empty tree, editor: prompt to create the first folder. Empty tree, viewer: "No documents yet."

### Edit mode

Visible only when signed in. An `EDIT` button at the right of the top bar toggles to `DONE`.

- Browse mode is identical to the viewer's view, so the editor always knows what the
  superior sees.
- In edit mode each row gains a rename control and a delete control.
- Each **expanded** folder gains `+ FOLDER` / `+ LINK` at the end of its contents; the same
  pair sits at the bottom of the page for creating top-level nodes.
- Forms are inline — the row or folder expands into a small form in place, following the
  existing `ProjectNote` pattern. No modals.
- The hidden EDIT button is cosmetic only; the real authorization check is server-side in
  every action.

## Server actions

`app/actions/doc-bank.ts`, following `update-project-note.ts`: each returns
`{ success: boolean; error?: string }` and re-checks `auth.getUser()` before touching data.

| Action | Input | Behaviour |
|---|---|---|
| `createNode` | `parentId \| null`, `kind`, `title`, `url?` | Validates depth <= 5, title, and URL shape; inserts. |
| `renameNode` | `id`, `title`, `url?` | Updates title; for links may also correct the URL. |
| `deleteNode` | `id` | Deletes the row; the FK cascade removes the branch. |

No move/reparent action in v1.

On success the client calls `router.refresh()`. Expanded folders stay open across the refresh.

### Delete confirmation

Descendant counts are computed client-side from the already-loaded tree — no extra query.

- Link: `Delete "Work Order 2024-25"?`
- Empty folder: `Delete "Drawings"?`
- Folder with contents: `Delete "Drawings" and everything inside it? 2 folders and 9 links.`

Deleting a link removes a pointer, never a file. Google Drive is untouched.

## Error handling

Database and auth failures are translated into plain messages shown on the form:

| Cause | Message |
|---|---|
| Unique index violation | Something with that name is already in this folder. |
| URL check violation / client validation | Link must start with https:// |
| Depth limit | Folders can only go 5 levels deep. |
| Blank title | Name can't be empty. |
| Title over 120 chars | Name is too long (max 120 characters). |
| No session | You're signed out. Log in again to make changes. |
| Anything else | Couldn't save. Try again. — with the real error logged via `console.error`, matching existing query-error logging. |

## Components

| File | Kind | Responsibility |
|---|---|---|
| `app/doc-bank/page.tsx` | server | Fetch nodes + user, build tree, render shell |
| `components/design/DocTree.tsx` | client | Edit-mode toggle, expansion state, delete confirms |
| `components/design/DocNodeRow.tsx` | client | One folder or link row, including its edit controls |
| `components/design/DocNodeForm.tsx` | client | Inline create/rename form for both kinds |
| `lib/doc-tree.ts` | pure | Build tree from flat rows; sort; count descendants; compute depth |
| `components/design/BottomNav.tsx` | server | Widened `active` prop, second link |
| `app/actions/doc-bank.ts` | server | The three actions above |

`lib/doc-tree.ts` is deliberately separate and free of React and Supabase: tree-building,
sorting, depth and descendant counting are the only non-trivial logic here, and keeping them
pure makes them unit-testable in isolation.

## Verification

Unit tests cover `lib/doc-tree.ts` in `tests/doc-tree.test.mjs`, following the `node:test`
style already used by `tests/notes.test.mjs`: tree assembly from flat rows, folders-before-
links alphabetical ordering, depth calculation, descendant counts, and orphan rows (a
`parent_id` whose row is missing) not vanishing silently.

The UI, actions and RLS have no automated coverage, so the rest is lint, build, and driving
the running app:

1. `npm run lint` and `npm run build` clean; `node --test tests/` passes.
2. In the browser, signed in: create nested folders, add a link, rename both, confirm
   alphabetical ordering with folders first.
3. Confirm a link opens Drive in a new tab.
4. Delete a branch; confirm the dialog's counts matched what disappeared.
5. Trigger each error message: duplicate name, `http://` URL, blank title, 6th level.
6. Check layout at 390px with a level-5 node — no horizontal overflow.
7. Signed out: EDIT button absent, links still open, and a direct action call is refused.

Screenshots of the working result are shared rather than asking the user to check manually.

## Amendments

### 2026-09-20 — Back button in the Doc Bank top bar

The `/doc-bank` top bar gains the same back button every other non-Home screen in the app
carries: the ink chevron rendered by `TopBar`, sitting in the hatch rule band to the left of
the title, linking to `/`.

- **Why a fixed `backHref="/"` and not history:** the Doc Bank is a bottom-nav tab, so the
  back button means "up to the dashboard", exactly as on `/mrf`. A `router.back()` would
  drop a Viewer who arrived from a `/m/` reply link straight back out of the app.
- **Why `DocTree` takes a `backHref` prop instead of hardcoding it:** navigation knowledge
  stays with the page, matching how `TopBar`'s other callers pass `backHref`.
- The button is `aria-label="Back"` and toggles nothing else; the EDIT action stays pinned to
  the right edge, unchanged.

```tsx
// app/doc-bank/page.tsx
<DocTree tree={tree} isEditor={!!user} backHref="/" />
```

**Verification:** `tsc --noEmit`, `npm run lint`, `node --test tests/*.test.mjs` — then `/doc-bank` at
390px with EDIT visible: chevron sits left of the title, tap returns to Home, no overlap with
EDIT or the bottom nav. No new tests; the change is markup only.
