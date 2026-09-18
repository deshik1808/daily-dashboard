# Design — Project Status Dashboard (Bio-Mining & MRF, Tirupati)

2026-09-18 · Based on PRD by @Someone, refined with Deshik

## 1. Purpose & scope

A mobile-first PWA where Deshik (Editor) logs daily progress on three Tirupati projects and his superior (Viewer) reviews it read-only. Full functional scope, screens, and acceptance criteria are as specified in the source PRD (`PRD — Project Status Dashboard (Bio-Mining & MRF, Tirupati).md`), which this document extends rather than restates. Key points repeated here only where a decision was made or clarified.

**Projects covered:** Bio-Mining Phase I (Zigma, Completed), Phase II (Zigma, Completed), Phase III (Zigma, In progress), Phase III (Card Box Company, In progress), MRF Plant (Raghuram Hume Pipes, In progress).

## 2. Infrastructure decisions

- **Supabase:** new project created fresh (Postgres + Auth + Storage), free tier.
- **Source control / hosting:** git repo initialized locally → pushed to a new GitHub repository → connected to Vercel for auto-deploy on push to `main`.
- **Editor account:** exactly one Supabase Auth user (Deshik), provisioned directly (not a self-serve sign-up flow — the PRD explicitly excludes multi-user editing and public account creation).

## 3. Resolved open decisions (from PRD §7)

1. **Card Box inward figure:** filled **per shift**. Both the Day and Night rows for Card Box carry their own `inward_mt` value from the weighbridge "Legacy/MSW" figure; daily inward for Card Box = Day + Night summed at read time. Zigma has one shift (Full day) so this is moot for Zigma.
2. **Phase I / II seeding:** **one summary row each**, dated to the last report, carrying final cumulative order/inward/disposed figures. No full daily history is typed in for these two completed phases.

## 4. Data model

Unchanged from PRD §3 (phase master, daily/shift entry, MRF daily log — all figures stored as increments, totals computed at read time via a database view). See PRD for full field tables. No schema changes introduced by this design doc beyond what's there.

## 5. Offline queue design (PRD Phase 6)

**Approach:** custom IndexedDB queue (not the Background Sync API — better cross-browser/iOS Safari support, and full control over surfacing sync errors per-item).

- Editor writes (new/edit entry, new/edit MRF log) are written to a local IndexedDB table `pending_writes` immediately on save, tagged `pending`.
- The UI shows a small "queued, will sync" badge on anything not yet confirmed against the server.
- A `navigator.onLine` listener, plus a check on app foreground/visibility change, flushes the queue to Supabase in order.
- A rejection during sync (e.g. duplicate phase×date×shift, or a stale edit) surfaces as an error on that specific queued item. The user corrects or discards it; the rest of the queue keeps flushing — one bad item never blocks the others.
- Only the Editor queues writes this way. The Viewer never writes, so offline Viewer support is just the PWA shell + last-loaded-data cache (standard `next-pwa` behavior), no custom queue needed.

## 6. Photo pipeline design (PRD Phase 5)

Fully automatic — the Editor never performs a manual compression step, at any point.

1. Editor picks 1–10 photos (camera or gallery) in the MRF log form.
2. **Client-side compression** runs automatically in the browser (a canvas/JS-based resize library) before upload: max 1600px wide, targeting ≤250KB. This happens during the normal "uploading..." spinner — no separate action or confirmation step.
3. **Server-side backstop:** a Supabase Edge Function triggered on storage insert re-checks size and re-compresses anything that still lands above 250KB. This is a safety net for edge cases the client pass misses, runs asynchronously, and never blocks the Editor's upload flow.
4. Photos live in a **private** storage bucket. Both Viewer and Editor fetch them via short-lived signed URLs generated server-side — never a public bucket URL.

## 7. Error handling

- Duplicate (phase×date×shift) entries are rejected by a DB unique constraint; surfaced to the Editor as a specific "already logged for this date/shift" message, not a generic failure.
- Deletes are soft (`deleted_at` column) — all totals views filter deleted rows out; nothing is hard-deleted by application code.
- **RLS is the real security boundary** (per PRD §2): anonymous = read-only everywhere, authenticated Editor = read+write. Any API-level role checks are UX convenience only, never the enforcement point.

## 8. Testing / verification

- Each build phase (0–7, per PRD §6 table) is verified manually on a real Android phone before moving to the next — no phase is considered done until that manual check passes.
- The acceptance criteria checklist in PRD §7 is the final go/no-go gate before calling v1 shippable.
- No automated test suite is in scope for v1 (matches PRD's "Out of scope" list — this is a two-user internal tool, not a product with a QA budget).

## 9. Explicit process gate

Deshik will supply a visual design reference (mockup, screenshot, or style direction) before any UI screen is built. Backend/infra work (scaffold, schema, auth, offline queue plumbing, photo pipeline plumbing) may proceed without it; implementation must pause before Phase 3 (Home + Phase detail UI) and get that reference first.

## 10. Known constraints for Plan 2 (surfaced by the Foundation plan's whole-branch review)

- **Seed script must set `created_by` explicitly.** `bio_mining_entries.created_by` and `mrf_logs.created_by` are `not null default auth.uid()`. `auth.uid()` is NULL for privileged connections (service role, SQL editor, MCP `execute_sql`) — the default doesn't help there, and NOT NULL is a table constraint that still applies even though RLS is bypassed. Any seed SQL (PRD §6 Phase 7, the Phase I/II opening-balance rows from design doc §3 decision 2) must set `created_by` explicitly to the Editor's user id, `31325d35-08f4-4611-8264-03fd9e7fe9a7` (Deshik, `deshik1808@gmail.com`).
- **Offline queue batch writes need `created_by` set client-side, not left to the DB default.** PostgREST fills missing keys in a heterogeneous bulk insert with explicit NULL rather than falling back to the column default, unless the request sends `Prefer: missing=default`. If the offline queue (design doc §5) ever flushes multiple queued writes in one batched call, always set `created_by` from the session client-side rather than relying on the database default.
- **`bio_mining_entries`/`mrf_logs` insert policies now require `created_by = auth.uid()`** (tightened from `with check (true)` during the Foundation plan's hardening pass) — update policies were deliberately left at `using (true) with check (true)`, since this is a one-Editor system and per-row update ownership would be scope creep beyond the PRD's actual requirement.
- **Zigma/Card Box shift consistency (Zigma = `Full day` only, Card Box = `Day`/`Night`) is not enforced at the database level.** Postgres CHECK constraints can't reference other tables (no subqueries), so this needs a trigger if it's ever enforced in the DB — currently relies on the entry form only ever offering the correct shift options per agency (PRD §4: "shift field shown only for Card Box").
- **`phase_material_breakdown` returns zero rows for a phase with no entries yet** (not a placeholder row per material at zero) — Plan 2's chart/table code for Phase detail should handle the empty case explicitly rather than assuming at least one row per phase.
- **No `phase_master` row exists for the MRF project itself** — only `mrf_logs` (daily entries) has a table. PRD's Home screen wants 5 cards each with title/agency/status/%, but MRF has nowhere to store "Raghuram Hume Pipes / In progress" as structured data. Plan 2 needs to either add a lightweight MRF project-metadata row/table or hardcode those fields in the Home card component.
