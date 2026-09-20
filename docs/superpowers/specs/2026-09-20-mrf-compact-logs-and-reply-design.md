# MRF compact logs + WhatsApp reply — design

**Date:** 2026-09-20
**Status:** Approved for planning
**Scope:** `/mrf` list redesign, per-date log pages, short links, app-wide reply button

## Problem

Each MRF day carries up to 10 photos and 5–10 lines of notes, and `/mrf` renders every
day fully expanded. Three days of logs already fill several screens, so the Viewer
(Deshik's superior) cannot scan a week at a glance.

Separately, when the superior wants to ask about something he sees, he leaves the app
and sends a WhatsApp message with no reference to what he was looking at. Deshik then
has to guess which project and which day the question is about.

## Goals

1. `/mrf` becomes a scannable index: one compact row per day, roughly five days visible
   per phone screen.
2. Each day has its own stable, shareable URL carrying the full carousel and full notes.
3. A floating Reply button on every page opens WhatsApp to Deshik with the current
   screen already quoted, so the question arrives with its context attached.

## Non-goals

- Restructuring the Bio-Mining phase pages. They keep their current entry lists.
- In-app messaging, notifications, or read receipts. WhatsApp remains the channel.
- Changing who can write. RLS stays as it is: anonymous reads, Editor writes.

## Routes

| Route | Audience | Contents |
| --- | --- | --- |
| `/mrf` | all | Compact list, 30 newest days, `LOAD MORE` for older |
| `/mrf/2026-09-20` | all | One day: full photo grid + carousel, full notes, Reply |
| `/m/260920` | all | Redirect to `/mrf/2026-09-20`; the link sent over WhatsApp |
| `/mrf/new`, `/mrf/edit/[id]` | Editor | Unchanged |

Dates are the key. `/m/YYMMDD` expands mechanically to an ISO date, so no lookup table
is needed and the short path can always be reconstructed. This assumes one log per
calendar date, which matches current practice; the constraint is not enforced in the
database, so a hypothetical second log on one date would be unreachable from `/m/`.
If that ever happens, add `UNIQUE (log_date) WHERE deleted_at IS NULL` and merge.

## Compact list (`/mrf`)

Each day renders as one `Window`-framed row, tapped anywhere to navigate:

```
┌─────────────────────────────────────────────┐
│ 20 SEP 2026                               › │
│ ┌────┐┌────┐┌────┐┌────┐                    │
│ │img ││img ││img ││ +6 │                    │
│ └────┘└────┘└────┘└────┘                    │
│ Conveyor belt alignment completed on…       │
└─────────────────────────────────────────────┘
```

- **Header** — date in mono bold, right-aligned chevron.
- **Strip** — the first three photos as ~72px squares, then a `+N` tile filled in sage
  when more exist. With three or fewer photos the counter tile is omitted.
- **Note** — first non-empty line only, bullet markers stripped, clamped to one line
  ending in an ellipsis.
- The whole row is a single `<Link>`; thumbnails are not separately tappable. One
  target per row means no mis-taps and no ambiguity about what Reply refers to.
- No EDIT control on the list. Editing stays on the date page, Editor-only.
- The `+ ADD LOG` button stays pinned above the list for the Editor, as today.

### Volume

First paint loads the 30 most recent days (90 signed URLs). `LOAD MORE` fetches the
next 30. Older days remain directly reachable by their short link regardless of how
far back they are.

## Date page (`/mrf/2026-09-20`)

- TopBar reads `MRF · 20 SEP 2026` with a back affordance to `/mrf`.
- Full photo grid wired to the existing `PhotoGallery` carousel.
- Full notes through `FormattedNote`, untruncated.
- `‹ PREV DAY` / `NEXT DAY ›` stepping between logged dates, so the superior can walk
  a week without returning to the list.
- EDIT button, Editor-only, as today.
- A date with no log renders a "No log for this date" window and a link back to `/mrf`.

## Reply button

A server-rendered floating pill in the bottom-right, above the bottom nav, present on
Home, phase pages, `/mrf`, `/mrf/[date]`, and Doc Bank. Each page supplies one object:

```ts
type ReplyContext = { label: string; path: string };

// Home        → { label: "Home — all projects",         path: "/" }
// Phase page  → { label: "Bio-Mining Phase III · Zigma", path: "/phase/<id>" }
// MRF list    → { label: "MRF Plant · all logs",         path: "/mrf" }
// MRF date    → { label: "MRF Plant · 20 Sept 2026",     path: "/mrf/2026-09-20" }
// Doc Bank    → { label: "Doc Bank",                     path: "/doc-bank" }
```

It renders a plain anchor to `https://wa.me/<number>?text=<encoded>` — no client JS, no
latency, the href is complete when the page arrives. Message body:

```
Re: MRF Plant · 20 Sept 2026
https://is.gd/a9Kd2X

```

Decisions:

- The number lives in the server-only env var `REPLY_WHATSAPP_NUMBER` (E.164 digits, no
  `+`). It is never shipped to the browser.
- The button is hidden while the Editor is signed in.
- It is styled as a mono `↩ REPLY` pill in ink, staying inside the 1-bit palette rather
  than using WhatsApp green.

## Short links

Long Vercel URLs are the reason links look unusable in chat, and the host is the long
part. Two changes compound:

1. **Manual step:** rename the Vercel project so the host is short
   (`daily-dashboard-mauve-seven.vercel.app` → something like `tpt-logs.vercel.app`).
   The old address stops resolving, so the link is re-shared once and the superior
   re-adds the PWA if he installed it.
2. **Shortener with a cache.** A `short_links` table keyed by canonical path:

| Column | Type | Notes |
| --- | --- | --- |
| `path` | `text` primary key | e.g. `/mrf/2026-09-20` |
| `short_url` | `text not null` | e.g. `https://is.gd/a9Kd2X` |
| `created_at` | `timestamptz default now()` | |

- **Only the Editor mints.** The MRF create/update action mints on save; any page opened
  while signed in as Editor mints lazily if the row is missing. RLS: select open to all,
  insert restricted to `authenticated`. An anonymous visitor can never write rows or
  burn the API quota.
- **The Viewer never blocks on it.** With no cached row the href falls back to
  `/m/260920` on the app's own host. A 3-second timeout, a non-200, or a malformed
  response stores nothing and uses the fallback. The button always works.
- Expected volume is 1–3 links per day, well inside is.gd's free limits.

### Accepted trade-off

Every shortened URL is registered with a public third-party service, so the dashboard's
"private by URL" property is weakened: someone crawling is.gd could reach the logs. The
content is daily site photos and progress notes, and Deshik accepted this explicitly.

## Data and configuration

- **Migration `0009_short_links.sql`** — the table above plus its RLS policies. No change
  to `mrf_logs`.
- **Env** — `REPLY_WHATSAPP_NUMBER` (server-only, E.164 digits) and `APP_ORIGIN` (e.g.
  `https://tpt-logs.vercel.app`) for building absolute URLs server-side, falling back to
  Vercel's provided host when unset.

## Error handling

| Condition | Behaviour |
| --- | --- |
| `/m/` code unparseable or not a real date | Redirect to `/mrf` |
| Date has no log | "No log for this date" window, link back to `/mrf` |
| `REPLY_WHATSAPP_NUMBER` unset | Button does not render; a warning is logged |
| Shortener slow, down, or rate-limited | 3s timeout, nothing stored, `/m/` fallback used |
| Signed URL minting fails for a thumbnail | That tile renders empty; the row still navigates |

## Testing

Node test files under `tests/`, matching the existing `*.test.mjs` convention:

- `YYMMDD ↔ ISO` round-trip, including invalid, impossible, and out-of-range input.
- Note first-line extraction and truncation: bullets stripped, blank leading lines
  skipped, ellipsis only when the line was actually cut.
- WhatsApp text builder: label and URL composition, encoding, and the fallback-URL path
  when no short link is cached.

## Rollout order

1. Migration `0009` and the short-link helper, with the fallback path working first.
2. Date page and `/m/` redirect.
3. Compact list replacing the expanded cards.
4. Reply button, page by page.
5. Vercel rename, then re-share the link.

## Amendments

### 2026-09-20 — Reply pill glyph

The button keeps its labelled-pill form: an icon plus the word `REPLY`, outlined in ink on
paper, at the current `fixed bottom-20 right-4` position. An icon-only circle was
considered and rejected — the Viewer uses the app rarely, and a bare glyph makes the
first tap a guess. A pill that collapses to a circle on scroll was also rejected: it
would turn a pure server-rendered anchor into a client component with a scroll listener.

The glyph changes from the text character `↩` to an inline SVG reply arrow:

```tsx
<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
     stroke="currentColor" strokeWidth="2" strokeLinecap="round"
     strokeLinejoin="round" aria-hidden className="shrink-0">
  <path d="M9 14 4 9l5-5" />
  <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
</svg>
```

- **Why SVG:** the character renders at Courier Prime's mercy and sits off-baseline on
  Android. A path does not.
- **Why inline, not an icon package:** the app has no icon dependency, and one 14px path
  does not justify adding one.
- **Why a reply arrow rather than the WhatsApp mark:** it stays inside the 1-bit line
  vocabulary and does not bake a third-party brand into the design system or tie the
  button to one channel.
- `stroke="currentColor"` inverts the icon along with the text on the existing
  `hover:bg-ink hover:text-paper`.

Everything else is unchanged: pill geometry, `aria-label`, server-only rendering,
hidden-for-Editor and missing-number behaviour, and `lib/reply.ts`.

**Verification:** `tsc --noEmit`, `eslint`, then `/mrf` signed out in a phone-width
browser — pill renders, glyph is crisp, hover inverts both text and icon. No new tests;
there is no new logic and `buildReplyHref` is already covered.
