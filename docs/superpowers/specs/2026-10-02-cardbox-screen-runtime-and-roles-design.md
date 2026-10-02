# Card Box Screen Runtime & Role-Based Access — Design

**Date:** 2026-10-02
**Status:** Approved (design); implementation not started

## Problem

The superior wants to know how long Card Box's two processing screens actually run each
shift, how much time is lost to breakdowns, and why. Nobody records this today.

The person who knows these numbers is the field operator who runs the screens, so he needs
to enter them himself, along with Card Box's tonnage entries. But the app has only one kind
of login: anyone signed in is treated as the Editor, by the UI (`isEditor()` is true for any
session) and by the database (every write policy only checks `to authenticated`). A second
login handed out today would carry full Editor powers. And the whole dashboard is readable
without any login, so he would also see every project, the MRF logs and the Doc Bank.

## Goal

1. A **screen runtime log** for Card Box: per shift (Day / Night), per screen (Red, Yellow),
   the runtime, the breakdown time and the breakdown reasons, typed in directly.
2. **Three roles**, enforced by the database as well as the app:
   - **Editor** (Deshik): everything, as today.
   - **Viewer** (the superior): sees everything, changes nothing.
   - **Operator** (the field operator, Card Box): sees only Card Box; adds Card Box tonnage
     entries and runtime logs; edits or deletes only records he created.
3. The dashboard becomes **login-only**. Nothing is readable without signing in, through the
   app or directly against the database API.

Out of scope: in-app user management (logins are created in the Supabase dashboard and
tagged with one SQL statement), per-reason analytics (reasons are free text), charts,
exports, timers or hour-meter readings, and runtime for any agency other than Card Box.

## Decisions

| Question | Decision |
|---|---|
| What can the operator change? | Card Box tonnage entries and screen runtime logs. Nothing else. |
| Breakdown shape | One total breakdown time and one free-text reasons note, per screen per shift. |
| Shift length | Varies. No fixed length; the only guard is runtime + breakdown ≤ 12 h per screen per shift. No "% of shift" figure. |
| Operator edits | Only records he created. The Editor can edit everything, including his. |
| Record granularity | One record per shift covering both screens. Tonnage keeps its own form. |
| What the operator can see | Card Box only. No other projects, no MRF, no Doc Bank. |
| Superior's access | His own view-only login. The dashboard is no longer public. |
| Screen names | Red Screen and Yellow Screen, in that order. |
| Night shift date | The date the shift started. |
| Project note | Hidden from the operator (it is written for the superior). |
| REPLY pill | Hidden from the operator; the Viewer keeps it. |

## Part 1 — Roles and access

### Access matrix

| | Signed out | Viewer | Operator (Card Box) | Editor |
|---|---|---|---|---|
| Home | → `/login` | All projects | Card Box card(s) only, no MRF card | All projects |
| Card Box phase page | → `/login` | Everything | Everything except the project note | Everything, plus edit controls |
| Other phases, MRF, Doc Bank, short links `/p/*` and `/m/*` | → `/login` | View | → `/` (his home, Card Box only) | Full control |
| Add a Card Box tonnage entry or runtime log | – | – | ✓ | ✓ |
| Edit or delete a Card Box tonnage entry or runtime log | – | – | Only rows he created | All |
| All other writes (other entries, MRF, Doc Bank, phase edit, project notes, WhatsApp number) | – | – | – | ✓ |
| Notification bell | – | – | – | ✓ (unchanged) |
| "Enable notifications" banner | – | ✓ | – | ✓ |
| REPLY (WhatsApp) pill | – | ✓ | – | – (unchanged: hidden for the Editor in production) |

### How a login carries its role

The role lives in the Supabase user's **`app_metadata`**. Only the service role or SQL can
write it; a signed-in user cannot change their own (`auth.updateUser` writes
`user_metadata` only).

```json
{ "app_role": "editor" }
{ "app_role": "viewer" }
{ "app_role": "operator", "agency": "Card Box" }
```

- The key is `app_role`, not `role`, so a policy can never confuse it with the JWT's
  top-level `role` claim (`authenticated` / `anon`).
- `agency` holds the `agency_enum` value the operator is limited to. Scoping by agency
  rather than by phase id keeps working if Card Box ever gets another phase.
- Supabase copies `app_metadata` into every access token, and `getClaims()` already verifies
  that token locally. Reading the role therefore costs no network round trip, and the
  local-JWT performance architecture is untouched.
- A role change reaches an existing session at its next token refresh (≤ 1 h) or the next
  sign-in.
- **No `app_role` means no access.** Such a session can only reach `/login`, which says:
  "This login has no access yet. Ask Deshik to set it up, then sign out and back in."

### One source of truth: `lib/access.ts`

A new pure module (no Next or Supabase imports, unit-tested) that the proxy, pages and
actions all call:

- `parseRole(appMetadata)` returns `{ role: "editor" | "viewer" | "operator" | null, agency: string | null }`.
  An unknown role, or an operator without an agency, is treated as no role.
- `decideAccess(pathname, search, session)` returns `allow` or `redirect(to)`, checked in
  this order:
  1. `/api/*`: allow. Route handlers check the session themselves and answer 401 / 403,
     never a redirect.
  2. `/login`: allow.
  3. No session: redirect to `/login?next=<path + search>`.
  4. Session without a role: redirect to `/login`.
  5. Editor: allow.
  6. Viewer: the editor-only paths (`/entry/*`, `/runtime/*`, `/mrf/new`, `/mrf/edit/*`,
     `/phase/<id>/edit`) redirect to `/`; everything else is allowed.
  7. Operator: allow `/`, `/phase/<id>`, `/phase/<id>/runtime`, `/entry/*` and `/runtime/*`;
     everything else, including `/phase/<id>/edit`, redirects to `/`.
- `canWriteAgency(session, agency)`: Editor always; Operator only when `agency === session.agency`.
- `canEditRecord(session, { agency, created_by })`: Editor always; Operator only for his own
  agency **and** `created_by === session.userId`.

Rule 7 only checks the shape of the path, so `/phase/<id>` could be any phase. The page
completes the check once it knows the phase's agency (below).

### Enforcement layers

**1. Proxy (`proxy.ts`).** It already calls `getClaims()` to refresh the session; it now also
reads `app_metadata` and applies `decideAccess`. The matcher skips static files (anything
with a file extension, such as `sw.js`, `workbox-*.js`, `worker-*.js`, `manifest.json`, icons
and SVGs, plus `_next/static` and `_next/image`), so the PWA and its service worker still load
on a signed-out device. Nothing in `public/` is sensitive.

**2. Pages and actions.**

- `lib/auth.ts` gains `getSession()`, returning `{ userId, role, agency }` or `null`. It is
  memoized with `cache()` and follows today's `isEditor()` rules: `getClaims()` first,
  `getUser()` only when verification fails, and `unstable_rethrow` before any catch.
  `isEditor()` becomes `role === "editor"`.
- Pages that take an id check the record's agency. If an operator opens `/phase/<id>`,
  `/phase/<id>/runtime`, `/entry/new?phase=<id>` or `/runtime/new?phase=<id>` for another
  agency's phase, he is redirected to `/`. If he opens `/entry/<id>` or `/runtime/<id>` for a
  row he didn't create, he is redirected to that row's phase page. If RLS hides the row from
  him entirely (another agency's row), he is redirected to `/`. No error screen in any case.
- The editor-only pages (`/phase/<id>/edit`, `/mrf/new`, `/mrf/edit/<id>`) check for the
  Editor role rather than just a session, as a second line behind the proxy.
- Server actions re-check with `getUser()` before writing, because it returns fresh
  `app_metadata`. `requireEditor()` in mrf-logs, doc-bank, phase-master,
  update-project-note and settings becomes a real role check instead of "has a session".
  bio-mining-entries and the new runtime actions use `canWriteAgency` and `canEditRecord`.
- Data the operator must not see is never handed to a client component for him. The project
  note text is not passed to `ProjectNote`, and the home page only maps his agency's rows into
  cards.

**3. Database (RLS).** The final word, so a UI bug can neither leak nor corrupt anything.
This includes requests made straight to the Supabase REST API with the public anon key or the
operator's own token.

- **Anon: no policies on any table, so no access at all.**
- Viewer and Editor read everything. Only the Editor writes, with one exception:
- The operator reads only his agency's rows in `phase_master`, `bio_mining_entries` and
  `screen_runtime_logs`. The same applies to `phase_totals` and `phase_material_breakdown`,
  which are `security_invoker` views. He can insert into the two entry tables only for his
  agency's phases, with `created_by = auth.uid()`. He can update rows, including soft delete,
  only where he created them in his agency. He reads nothing from `mrf_logs`, `doc_nodes`,
  `app_settings`, `short_links`, `push_subscriptions` or the `mrf-photos` bucket.

Helpers (new, in `0011`):

```sql
create or replace function public.app_role() returns text
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', '')
$$;

create or replace function public.app_agency() returns text
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'agency', '')
$$;

-- True when the phase belongs to the caller's agency.
create or replace function public.is_my_agency_phase(p_phase_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.phase_master pm
    where pm.id = p_phase_id and pm.agency::text = public.app_agency()
  )
$$;
```

Policy shape for the two operator-writable tables (`bio_mining_entries` shown;
`screen_runtime_logs` is identical):

```sql
create policy entries_select on bio_mining_entries for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
  or (public.app_role() = 'operator' and public.is_my_agency_phase(phase_agency_id))
);

create policy entries_insert on bio_mining_entries for insert to authenticated with check (
  created_by = auth.uid() and (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and public.is_my_agency_phase(phase_agency_id))
  )
);

create policy entries_update on bio_mining_entries for update to authenticated
  using (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and created_by = auth.uid()
        and public.is_my_agency_phase(phase_agency_id))
  )
  with check (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and created_by = auth.uid()
        and public.is_my_agency_phase(phase_agency_id))
  );
```

`with check` repeats the agency test so an operator cannot move his own row to another phase.

Every other table:

| Table | Select | Insert / update / delete |
|---|---|---|
| `phase_master` | Editor, Viewer; Operator where `agency::text = app_agency()` | Editor |
| `mrf_logs`, `doc_nodes`, `app_settings`, `short_links` | Editor, Viewer | Editor. Existing `created_by = auth.uid()` insert checks stay. |
| `push_subscriptions` | none | none. Only the server's service-role client touches it. |
| `storage.objects` in bucket `mrf-photos` | Editor | Editor |

### Server-side reads

`lib/data.ts` currently reads through `lib/supabase/public.ts`, a cookie-free **anon** client,
which is what lets its `use cache` results be shared by everyone. With anon locked out, that
file is replaced by **`lib/supabase/reader.ts`**. It has the same module-level, cookie-free
shape but uses the service-role key, and it starts with `import "server-only"` so it can never
be bundled for the browser.

- Caching, tags and lifetimes in `lib/data.ts` don't change. The results are still identical
  for everyone, so they can still be shared.
- This client bypasses RLS, so **the app is the read guard for rendered pages**: the proxy
  and page checks decide what each role is shown. RLS stays the guard for anything a browser
  token can reach directly.
- It is used for reads only: `lib/data.ts`, `signMrfPhotoUrls` and `app/p/[code]/route.ts`.
  Writes keep using the request-bound client so RLS sees the real user.
- `getPhaseEntries` adds `created_by` to its select, which is needed to show EDIT on the
  operator's own rows.
- `SUPABASE_SERVICE_ROLE_KEY` is already set locally and on Vercel, since push uses it.

### Screens that change for roles

- **Home (`app/page.tsx`).** For the operator: only phases of his agency, and no MRF card.
  Header line: the Editor keeps `EDITOR SETTINGS · SIGN OUT`; the Viewer and Operator get
  `SIGNED IN AS VIEWER · SIGN OUT` or `SIGNED IN AS OPERATOR · SIGN OUT`.
- **Login (`app/login/page.tsx`).**
  - The title becomes `LOGIN` (was `EDITOR LOGIN`). No back button while signed out, since
    it would only loop back here.
  - After sign-in, go to `next` if it is a safe relative path (starts with `/`, not `//`, not
    `/login`); otherwise go to `/`.
  - The signed-in panel shows the role. The WhatsApp number setting is Editor-only.
  - An account with no role sees the "no access yet" message and Sign out.
- **Bottom nav.** The Doc Bank tab is hidden for the operator.
- **Phase page.** The project note isn't rendered for the operator. In ENTRIES,
  `+ ADD ENTRY` appears for the Editor and for the Operator on his own agency's phase. EDIT is
  decided per row by `canEditRecord`, so `EntryRow` takes `canEdit` instead of `isEditor`.
- **REPLY pill.** Shown to the Viewer only. The Editor still mints short links on visit, as today.
- **Notifications.**
  - The root-layout banner (`PushSubscription`) is rendered only for the Editor and Viewer.
    A small session-aware server wrapper inside a `Suspense` boundary decides this, so the
    layout stays prerenderable.
  - The bell stays Editor-only.
  - `POST` and `DELETE /api/push`, and `POST /api/push/test`, require an Editor or Viewer
    session (401 otherwise).
  - `GET /api/push` (the public VAPID key) stays open, because the service worker fetches it
    when a subscription rotates.

### Creating logins

Deshik creates each user in the Supabase dashboard: Authentication → Add user, with an email
and password and "Auto confirm user" ticked. The email doesn't need to be a real inbox. He
then tags the user, filling in the login email:

```sql
-- Viewer (the superior)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"app_role":"viewer"}'
where email = 'superior-login@example.com';

-- Operator (Card Box)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"app_role":"operator","agency":"Card Box"}'
where email = 'cardbox-operator@example.com';
```

Migration `0011` tags Deshik's own account (`31325d35-08f4-4611-8264-03fd9e7fe9a7`) as
`editor`. Check that id against `auth.users` before applying.

## Part 2 — Screen runtime

### Data model

One row per Card Box phase × date × shift, covering both screens. It follows the same
conventions as `bio_mining_entries`: incremental rows, totals computed on read, soft delete,
`created_by` attribution and a partial unique index.

```sql
create table screen_runtime_logs (
  id                        uuid primary key default gen_random_uuid(),
  phase_agency_id           uuid not null references phase_master(id),
  log_date                  date not null,
  shift                     shift_enum not null,
  red_runtime_min           integer not null,
  red_breakdown_min         integer not null default 0,
  red_breakdown_reasons     text,
  yellow_runtime_min        integer not null,
  yellow_breakdown_min      integer not null default 0,
  yellow_breakdown_reasons  text,
  created_by                uuid not null default auth.uid() references auth.users(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz,

  constraint screen_runtime_day_night check (shift in ('Day', 'Night')),
  constraint screen_runtime_red_minutes check (
    red_runtime_min >= 0 and red_breakdown_min >= 0
    and red_runtime_min + red_breakdown_min <= 720),
  constraint screen_runtime_yellow_minutes check (
    yellow_runtime_min >= 0 and yellow_breakdown_min >= 0
    and yellow_runtime_min + yellow_breakdown_min <= 720),
  constraint screen_runtime_red_reason check (
    red_breakdown_min = 0 or btrim(coalesce(red_breakdown_reasons, '')) <> ''),
  constraint screen_runtime_yellow_reason check (
    yellow_breakdown_min = 0 or btrim(coalesce(yellow_breakdown_reasons, '')) <> '')
);

create unique index screen_runtime_logs_unique_shift
  on screen_runtime_logs (phase_agency_id, log_date, shift)
  where deleted_at is null;

create trigger screen_runtime_logs_set_updated_at before update on screen_runtime_logs
  for each row execute function set_updated_at();

alter table screen_runtime_logs enable row level security;
-- Plus the select / insert / update policies from Part 1, final from day one.
```

- Times are stored as whole minutes. 720 minutes = 12 h, the per-screen-per-shift ceiling.
- The two screens are columns rather than a row each. One form save is then one row and one
  atomic write, and ownership is per row. A third screen would need a migration, which is
  acceptable for a fixed plant.
- Reasons are optional when the breakdown is 0, so they can still hold a note such as "idle,
  no material". They are shown whenever present.
- "Runtime exists only for Card Box" is enforced by the app
  (`SCREEN_RUNTIME_AGENCIES = ["Card Box"]`), not the database, the same stance as today's
  shift-per-agency rule. Operator RLS limits him to his agency either way.

### Validation: `lib/runtime.ts` (pure, unit-tested)

| Field | Rule | Message |
|---|---|---|
| Date | Required, valid `YYYY-MM-DD`, not in the future. Reuses `validateReportDate`. | Its existing messages ("Date is required", "Date cannot be in the future", …) |
| Shift | `Day` or `Night` | "Select a shift" |
| Runtime h / m, each screen | At least one box filled (a blank box counts as 0). Hours are a whole number 0–12; minutes a whole number 0–59. | "Enter the runtime (0 is fine)" / "Hours must be a whole number from 0 to 12" / "Minutes must be a whole number from 0 to 59" |
| Breakdown h / m, each screen | Both blank means 0. Same number rules. | Same as runtime |
| Runtime + breakdown, each screen | ≤ 12 h | "Runtime + breakdown can't be more than 12 h" |
| Reasons, each screen | Required (non-blank) when breakdown > 0. Trimmed; blank becomes `null`. | "Add a reason for the breakdown" |

Also exported:

- `formatDuration(min)` returns `"9 h 30 m"`, `"11 h 00 m"`, `"22 m"` or `"0 m"`.
- `summarizeRuntime(rows)` returns `{ shifts, red: { avgRunMin, avgBreakdownMin }, yellow: { … } }`.
  The averages are over shift records, rounded to the nearest minute. It returns `null` when
  there are no rows.
- `SCREEN_RUNTIME_AGENCIES`.

### Routes and forms

These mirror the tonnage-entry routes:

| Route | Who | What |
|---|---|---|
| `/phase/<id>/runtime` | Every role that can see the phase | Full runtime log |
| `/runtime/new?phase=<id>` | Editor; Operator (his agency) | New shift runtime |
| `/runtime/<id>` | Editor; Operator (his rows) | Edit, plus soft delete |

The form is `components/design/RuntimeForm.tsx`, using `useActionState` like `EntryForm`:

```
REPORT           Date [          ]   Shift [ Day ▾ ]
                 Night shift: use the date the shift started.
■ RED SCREEN     Runtime    [  ] h [  ] m
                 Breakdown  [  ] h [  ] m
                 Reasons    [                         ]
■ YELLOW SCREEN  (same three fields)
[ SAVE ] [ CANCEL ]
```

- Number boxes use `inputMode="numeric"`. A red or yellow square marker sits before each
  screen name.
- The edit page adds the same `DANGER ZONE` soft-delete block entries use, with the text:
  "This removes the shift from the runtime log. It stays recoverable in the database."
- The actions live in `app/actions/screen-runtime.ts`: `createRuntimeLog`,
  `updateRuntimeLog` and `deleteRuntimeLog`. Each one:
  - validates the input,
  - role-checks with `canWriteAgency` or `canEditRecord`,
  - writes through the request-bound client,
  - calls `updateTag(TAGS.runtime)`,
  - redirects to `/phase/<id>`.
- After a create, a push notification goes out via `after()`, as it does for entries. Title:
  `Screen Runtime`. Body: `Card Box screen runtime logged · 02 Oct, Day shift`. URL:
  `/phase/<id>`.

### Tonnage form tweak

`lib/entries.ts` gains `shiftsForAgency(agency)`: Card Box gets `Day` and `Night`; any other
agency keeps all three (unchanged). `EntryForm` offers only those, plus the entry's current
value when editing so an old row never becomes uneditable. `createEntry` and `updateEntry`
reject a shift that the phase's agency doesn't work.

### Display

**Card Box phase page.** A new `SCREEN RUNTIME` window goes after MATERIAL BREAKDOWN and
before ENTRIES. It is rendered only when `phase.agency` is in `SCREEN_RUNTIME_AGENCIES`.

```
SCREEN RUNTIME
LAST 30 DAYS · 58 SHIFTS          AVG PER SHIFT
                          RUN        BREAKDOWN
■ RED                9 h 15 m             22 m
■ YELLOW             9 h 41 m             13 m
────────────────────────────────────────────────
02 OCT · DAY                              [EDIT]
■ RED      run  9 h 30 m   breakdown  1 h 15 m
           Belt cut 55 min, power cut 20 min
■ YELLOW   run 10 h 45 m   breakdown  —
… latest 4 shifts …
[ + ADD SHIFT RUNTIME ]          VIEW FULL LOG →
```

- The summary always covers the last 30 days, whatever the ENTRIES range buttons are set to.
- It lists the latest 4 shift records, newest first: by date descending, and Night before Day
  within a date.
- A non-zero breakdown is shown in the accent colour; zero shows `—`. Reasons sit under the
  screen they belong to, with no tap-to-expand.
- `+ ADD SHIFT RUNTIME` appears for the Editor and Operator. EDIT is decided per row by
  `canEditRecord`.
- Empty state: "No runtime logged yet."

**Full log page `/phase/<id>/runtime`.**

- Top bar `SCREEN RUNTIME · CARD BOX`, with a back button to the phase page.
- `LAST 30D` / `ALL TIME` buttons (`?range=all`), and the same summary for the chosen range.
- Every shift record in the range, plus `+ ADD SHIFT RUNTIME`.
- The REPLY pill for the Viewer, and its own `loading.tsx`.

**Data.** `getRuntimeLogs(phaseId, since)` in `lib/data.ts` uses `use cache`,
`cacheLife("hours")` and a new `TAGS.runtime`, and selects `created_by` along with the
runtime columns. `since` is computed outside the cache scope, as `getPhaseEntries` does. The
summary comes from the fetched rows via `summarizeRuntime`; no new database view.

**Components.** `components/design/RuntimeSummary.tsx` (the summary table) and
`components/design/RuntimeRow.tsx` (one shift record), shared by both pages.

## Error handling

| Cause | What the user sees |
|---|---|
| A field rule is broken | The message under that field (validation table above) |
| Duplicate phase + date + shift (`23505`) | "Already logged for this date and shift. Edit it instead." |
| RLS refuses an insert (`42501`) | "You don't have permission to change this record." |
| An update or soft delete changes 0 rows (detected with `.select("id")` on the update) | The same permission message |
| A check constraint fails (`23514`); should be unreachable behind validation | "Could not save. Please check the values and try again." |
| Session expired | From an action: "You're signed out. Sign in again to save." From navigation: proxy → `/login?next=…` → back to the page after sign-in |
| Operator opens a page outside his scope | Redirect to `/`, or to the phase page for a record he can't edit |
| Account has no `app_role` | `/login` shows the "no access yet" message |
| Anything else | "Could not save. Please try again.", with the real error logged via `console.error` |

An update can change 0 rows because RLS hides the row from it, or because the row was already
deleted. Postgres reports an RLS-blocked update as a success that changed nothing, not as an
error, which is why updates must check the returned rows.

## Rollout

The order matters for two reasons: nobody can ever be locked out by a login that has no
role, and the operator must never see the open version.

1. Deshik creates the superior's login, and it is tagged `viewer` (SQL above).
2. **Migration `0011_roles_and_screen_runtime.sql`** (additive only): the role helpers,
   `is_my_agency_phase`, `screen_runtime_logs` with its final policies, and Deshik's account
   tagged `editor`. Then run `notify pgrst, 'reload schema';` and regenerate
   `lib/supabase/database.types.ts`. The live (old) app is unaffected.
3. **Ship the app** (push to `main`, which deploys on Vercel). Sign-in becomes required.
   Deshik signs out and back in once to pick up `app_role: editor`. The superior is signed in
   on his phone, in both the browser and the installed app if he uses both.
4. **Migration `0012_private_dashboard.sql`** (lock-down): role-based policies on every
   existing table and the `mrf-photos` bucket, with the anon and open policies dropped. Then
   run `notify pgrst, 'reload schema';` and the database checks below.
5. Deshik creates the operator's login, and it is tagged `operator` / `Card Box`. Only then
   is the app link given to him.

Migrations are applied through the Supabase connector, which is disabled in the session that
wrote this spec; enable it at step 2.

## Verification

**Automated (`node --test tests/*.test.mjs`)**

- `tests/runtime.test.mjs`:
  - duration parsing (blank, 0, out of range, decimals),
  - the 12 h ceiling,
  - reasons required only when breakdown > 0,
  - future dates,
  - `formatDuration`,
  - `summarizeRuntime` (averages, rounding, no rows).
- `tests/access.test.mjs`:
  - `parseRole` (missing or unknown role, operator without agency);
  - `decideAccess` for every role against `/`, `/login`, `/api/push`, `/phase/x`,
    `/phase/x/edit`, `/phase/x/runtime`, `/entry/new`, `/runtime/new`, `/mrf`, `/mrf/new`,
    `/doc-bank`, `/p/x` and `/m/x`, including how `next` is encoded;
  - `canWriteAgency`;
  - `canEditRecord`.
- `tests/entries.test.mjs`: `shiftsForAgency`.

**Static:** `npx tsc --noEmit`, `npm run lint`, `npm run build`.

**Database.** Each case runs as SQL inside a rolled-back transaction, using `set local role`
and `set local request.jwt.claims`:

- **anon:** every table and view returns 0 rows, and every write is refused.
- **viewer:** reads everything; every write is refused.
- **operator (Card Box):**
  - Reads only Card Box rows of `phase_master`, `phase_totals`, `phase_material_breakdown`,
    `bio_mining_entries` and `screen_runtime_logs`.
  - Gets 0 rows from `mrf_logs`, `doc_nodes`, `app_settings`, `short_links` and
    `push_subscriptions`.
  - An insert for Card Box succeeds; an insert for Zigma is refused.
  - Updating a Card Box row the Editor created changes 0 rows.
  - Updating or soft-deleting his own row succeeds; moving his row to a Zigma phase is refused.
- **editor:** all reads and writes behave as before.

**Browser (localhost)**

- **Signed out (checked by Claude):** every page redirects to `/login?next=…`;
  `manifest.json`, `sw.js` and the icons still load; `GET /api/push` works; `POST /api/push`
  returns 401.
- **Signed in as each role** (Deshik signs in, Claude checks the pages):
  - **Editor:** everything works as before, plus runtime add, edit and delete, and the Card Box
    shift list.
  - **Viewer:**
    - read-only everywhere;
    - REPLY visible and the notification banner offered;
    - `/entry/new` and `/runtime/new` bounce to `/`.
  - **Operator:**
    - home shows only Card Box, with no Doc Bank tab;
    - `/mrf`, `/doc-bank` and the Zigma phase bounce to `/`;
    - the project note is absent;
    - the tonnage form offers only Day and Night;
    - he can add tonnage and runtime, with EDIT only on his own rows;
    - no banner, no bell, no REPLY.
- **375 px:** the runtime window, full log page and form fit without horizontal scroll.

Screenshots of the working result are shared rather than asking the user to check manually.

## Implementation map

| File | Change |
|---|---|
| `supabase/migrations/0011_roles_and_screen_runtime.sql` | New: role helpers, `is_my_agency_phase`, `screen_runtime_logs` with policies, Editor tag |
| `supabase/migrations/0012_private_dashboard.sql` | New: role-based RLS on every existing table and the `mrf-photos` bucket; anon and open policies dropped |
| `lib/access.ts` | New, pure: `parseRole`, `decideAccess`, `canWriteAgency`, `canEditRecord` |
| `lib/runtime.ts` | New, pure: validation, `formatDuration`, `summarizeRuntime`, `SCREEN_RUNTIME_AGENCIES` |
| `lib/supabase/reader.ts` | New: server-only service-role reader. Replaces `lib/supabase/public.ts`, which is deleted. |
| `lib/auth.ts` | `getSession()`; `isEditor()` derived from it |
| `lib/data.ts` | Reader client; `created_by` on entries; `getRuntimeLogs`; `TAGS.runtime` |
| `lib/entries.ts` | `shiftsForAgency()` |
| `lib/supabase/database.types.ts` | Regenerated |
| `proxy.ts` | Sign-in required; `decideAccess`; `next`; matcher skips files with extensions |
| `app/actions/screen-runtime.ts` | New: create, update, delete |
| `app/actions/bio-mining-entries.ts` | Role, agency and ownership checks; shift-vs-agency check; 0-row update detection |
| `app/actions/{mrf-logs,doc-bank,phase-master,update-project-note,settings}.ts` | Require the Editor role, not just a session |
| `app/api/push/route.ts`, `app/api/push/test/route.ts` | Writes require an Editor or Viewer session |
| `app/runtime/new/page.tsx`, `app/runtime/[id]/page.tsx` | New form pages |
| `app/phase/[id]/runtime/page.tsx`, `app/phase/[id]/runtime/loading.tsx` | New full log page |
| `app/phase/[id]/page.tsx` | Runtime window; note hidden for the operator; per-row `canEdit` |
| `app/entry/new/page.tsx`, `app/entry/[id]/page.tsx` | Agency and ownership checks |
| `app/phase/[id]/edit/page.tsx`, `app/mrf/new/page.tsx`, `app/mrf/edit/[id]/page.tsx` | Editor role check |
| `app/page.tsx` | Operator filtering; header line per role |
| `app/login/page.tsx` | `LOGIN` title; `next`; role panel; no-access message; Editor-only settings |
| `app/layout.tsx` | Banner rendered via a session-aware wrapper (Editor and Viewer only) |
| `app/p/[code]/route.ts` | Reader client |
| `components/design/RuntimeForm.tsx`, `RuntimeSummary.tsx`, `RuntimeRow.tsx` | New |
| `components/design/EntryRow.tsx` | `canEdit` prop |
| `components/design/EntryForm.tsx` | Shift options from `shiftsForAgency` |
| `components/design/BottomNav.tsx` | Doc Bank tab hidden for the operator |
| `components/design/ReplyButton.tsx` | Visible to the Viewer only |
| `tests/access.test.mjs`, `tests/runtime.test.mjs` | New |
| `tests/entries.test.mjs` | `shiftsForAgency` cases |

## Known limitations

- A role change reaches an existing session only after its next token refresh (≤ 1 h) or a
  fresh sign-in.
- Pages already stored in a device's offline (service worker) cache stay viewable offline on
  that device after sign-out. The operator's phone only ever stores pages he is allowed to
  see, which is why he gets the link only at rollout step 5.
- Shift-per-agency and runtime-only-for-Card-Box are enforced by the app, not the database.
  The exception is `screen_runtime_logs`, which only accepts Day and Night.
- There is no in-app user management. Adding or removing a login is a Supabase dashboard + SQL
  task.

## Docs to update after shipping

- `MEMORY.md` (repo): the three roles, the login-only dashboard, and `screen_runtime_logs`.
- PRD roles section: the Viewer now has a login.
