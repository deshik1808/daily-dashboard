# PRD — Project Status Dashboard (Bio-Mining & MRF, Tirupati)

2026-09-17 · @Someone

## 1. Purpose & scope

A mobile-first PWA where Deshik (Editor) logs daily progress on three Tirupati projects and his superior (Viewer) reviews it read-only.

**Projects covered**

| # | Project | Agency | Location | Status |
| --- | --- | --- | --- | --- |
| 1 | Bio-Mining, Phase I | Zigma | Ramapuram | Completed |
| 2 | Bio-Mining, Phase II | Zigma | Ramapuram | Completed |
| 3 | Bio-Mining, Phase III | Zigma | Ramapuram | In progress |
| 4 | Bio-Mining, Phase III | Card Box Company | Ramapuram | In progress |
| 5 | MRF Plant | Raghuram Hume Pipes | Thukivakam | In progress |

**In scope:** daily/shift tonnage entry, computed phase totals, MRF daily photo-and-note log, date filtering, two-role login, offline-tolerant PWA.

**Out of scope (v1):** trip counts, average load per trip, loss analysis, contractor uploads, alerts/notifications, PDF export, multi-user editing, analytics beyond totals.

## 2. Users & roles

Exactly two roles. Only the Editor logs in (email + password, Supabase Auth). The Viewer opens the app URL and sees everything read-only, with no login, no email, no account.

| Role | Who | Login | Can |
| --- | --- | --- | --- |
| Editor | Deshik | Yes | Create, edit, delete entries; upload MRF photos; manage phase master data (order qty, inward qty) |
| Viewer | Superior | No | Open the URL; view all dashboards and logs; filter by date; nothing else |

Enforced in the database (Supabase Row Level Security): anonymous = read-only on all tables and photos; authenticated Editor = read + write. A write without a valid Editor session must be refused. Trade-off accepted: anyone who has the URL can read the data, so the URL is shared privately and never posted publicly.

## 3. Data model

All bio-mining figures are stored as **increments** (one row per report), never as running totals. Totals, balances and percentages are computed at read time. Editing one wrong row must not corrupt anything else.

**Bio-mining — phase master (one row per phase × agency)**

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid |  |
| phase | enum: I, II, III |  |
| agency | enum: Zigma, Card Box | Phase III has two rows, one per agency; never merged |
| order\_qty\_mt | number | From work order, e.g. Phase I = 221,473 |
| inward\_qty\_mt | number | Editor-maintained; entered as increments in the same daily/shift row (see below) |
| status | enum: Completed, In progress |  |

**Bio-mining — daily / shift entry (one row per report)**

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid |  |
| phase\_agency\_id | fk | Which phase × agency |
| report\_date | date |  |
| shift | enum: Day, Night, Full day | Zigma = Full day (one per date); Card Box = Day and Night (two per date). Unique on (phase\_agency\_id, report\_date, shift) |
| inward\_mt | number | Legacy waste taken in during this report |
| soil\_mt, rdf\_mt, stones\_mt, inert\_mt, steel\_mt, tyre\_mt, wood\_mt, glass\_mt, iron\_scrap\_mt, wires\_cables\_mt, others\_mt | number, nullable | Disposed by material; blank = 0 |
| remarks | text, optional |  |
| created\_by, created\_at, updated\_at | audit |  |

**Computed (not stored):** cumulative inward = Σ inward\_mt; cumulative disposed = Σ all material columns; balance = inward − disposed; % of order = cumulative inward ÷ order\_qty; per-material share = material ÷ cumulative disposed. Losses are shown only as the balance figure, with no label or highlight.

**MRF — daily log (one row per date)**

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid |  |
| log\_date | date | Unique |
| note | text | Short daily note |
| photos | array of storage URLs | 1–10 images. Compression is automatic, never a manual step: the browser compresses on upload; a server function re-compresses anything that arrives above the limit |
| created\_by, created\_at, updated\_at | audit |  |

## 4. Functional requirements

**Screens (mobile-first, bottom navigation)**

| Screen | Viewer | Editor | Content |
| --- | --- | --- | --- |
| Home | ✓ | ✓ | One card per project row (5 cards): title, agency, status chip, % of order qty, last-updated date. Small "Editor login" link in the footer |
| Phase detail | ✓ | ✓ | Header: order qty, cumulative inward, cumulative disposed, balance, % of order. Table: material, disposed MT, share %. Below: entry list, newest first, filterable by date range |
| New / edit entry | – | ✓ | Form matching the daily/shift row; shift field shown only for Card Box; numeric keypad on mobile; save works with weak network (queued) |
| MRF log | ✓ | ✓ | Reverse-chronological feed: date, 1–10 photos, note. Date-range filter and single-date jump |
| New / edit MRF log | – | ✓ | Date, note, camera/gallery upload |
| Editor login | – | ✓ | Email + password; session persists; not shown to the Viewer |

**Rules**

- Phase III Zigma and Phase III Card Box are separate cards and separate detail screens. No combined total anywhere.
- Phase I and II are read-only by default; Editor can still correct a row if needed.
- Duplicate (phase × agency, date, shift) is rejected with a clear message.
- Numbers display in MT with two decimals and Indian digit grouping (1,04,290.50).
- Date filter defaults to the last 30 days; "All time" is one tap away.
- Every entry shows who created it and when.
- Deleting an entry asks for confirmation; deletions are soft (flag, not removal) so totals can be recovered.
- MRF photos are compressed automatically to ≤ 250 KB each (max 1600 px wide). Editor never compresses by hand.

## 5. Non-functional requirements

- **Mobile-first:** designed for 360–430 px wide screens first; desktop is a stretched version, not a separate layout. Test on Android Chrome.
- **PWA:** installable to home screen, app icon and name, works over HTTPS, caches the shell so it opens instantly. Viewer can read last-loaded data offline; Editor can draft an entry offline and it syncs when online.
- **Performance:** Home screen loads in under 2 seconds on 4G. Totals are computed by a database view, not by summing rows in the browser.
- **Security:** Row Level Security on every table; storage bucket for photos is private, served through signed URLs; no service-role key in the frontend.
- **Hosting:** Vercel (frontend) + Supabase (Postgres, Auth, Storage) free tiers. Expected load is two users, so free tier is sufficient for at least a year.
- **Backup:** weekly CSV export of all tables to Supabase Storage, triggered by a scheduled function.
- **Data volume estimate:** \~3 bio-mining rows per day × 365 = \~1,100 rows/year; MRF \~365 rows and up to \~3,650 photos/year. Supabase free tier gives 1 GB storage, so photos must stay ≤ 250 KB (≈ 0.9 GB/year). At 1 MB each you exceed the free tier in 4 months.

## 6. Tech stack & build phases (for the AI agent)

**Stack:** Next.js (App Router, TypeScript) + Tailwind + Supabase (Postgres, Auth, Storage) + `next-pwa` for the service worker. Deployed on Vercel.

Give the agent one phase per prompt. Each phase names the files it may touch. Do not move to the next phase until the previous one is verified on a phone.

| Phase | Responsibility | May edit | Done when |
| --- | --- | --- | --- |
| 0 | Project scaffold, Supabase client, env vars, PWA manifest | `/app/layout.tsx`, `/lib/supabase.ts`, `/public/manifest.json`, `next.config.js` | App installs to Android home screen and opens a blank shell |
| 1 | Database schema + RLS + totals view (SQL migration only) | `/supabase/migrations/*` | Editor can insert; Viewer insert is refused in SQL editor |
| 2 | Auth: login page, role lookup, route guard | `/app/login/*`, `/middleware.ts` | Viewer sees Home, Editor sees Home + "Add" button |
| 3 | Home + Phase detail (read only, real data) | `/app/(dash)/*`, `/components/PhaseCard.tsx`, `/components/PhaseDetail.tsx` | Numbers match a hand-calculated total from seed rows |
| 4 | Bio-mining entry form (create, edit, soft delete) | `/app/(dash)/entry/*`, `/components/EntryForm.tsx` | Duplicate date+shift is rejected; totals update instantly |
| 5 | MRF log: feed, filter, photo upload with compression | `/app/(dash)/mrf/*`, `/components/MrfLog.tsx` | 10 photos upload from phone camera under 20 s on 4G, each stored ≤ 250 KB |
| 6 | Offline: cache shell, queue Editor writes | `/public/sw.js`, `/lib/offlineQueue.ts` | Entry saved in airplane mode syncs on reconnect |
| 7 | Seed script: opening balances for Phases I, II, III from current sheets | `/supabase/seed.sql` | Home shows today's real figures |

**Prompting rules for the agent:** one phase per prompt; state mobile constraints in every prompt; ask the agent to list changed files at the end; you verify on your phone before approving the next phase; correct with micro-prompts, not re-plans.

## 7. Acceptance criteria & open decisions

**Ship v1 only when all of these pass on a phone:**

- [ ] Superior opens the URL with no login, lands on Home, sees 5 cards with correct % figures
- [ ] Superior cannot see any Add / Edit / Delete control
- [ ] Editor adds a Card Box Night shift entry; Phase III Card Box totals update; Phase III Zigma totals do not change
- [ ] Editor cannot add a second Zigma entry for the same date
- [ ] Phase I header shows order 221,473 / inward 227,492.50 / disposed 190,895.70 / balance 36,596.80 after seeding
- [ ] MRF feed filters to a single date and shows only that day's photos and note
- [ ] App installs from Chrome as a PWA and reopens without the browser bar
- [ ] Entry saved offline appears after reconnecting

**Open decisions (answer before Phase 1):**

1. Does Card Box's inward come from its weighbridge "Legacy/MSW" figure per shift, or from a separate daily inward figure? This decides whether `inward_mt` is filled per shift or once a day.
2. Should Phase I and II opening balances be seeded as one row each (dated to the last report), or do you want the full history typed in? Recommended: one row each.
