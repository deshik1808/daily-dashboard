# Design — Home & Phase Detail (Visual Design System + Read-Only Screens)

2026-09-19 · Brainstormed with Deshik via the visual companion (mockups in `.superpowers/brainstorm/485-1789785130/content/`, gitignored — screenshots below describe the approved state)

## 1. Scope

This spec covers the first real-UI slice of the app: the visual design system (tokens + component set) and the two read-only screens that prove it out — **Home** (5 project cards) and **Phase detail** (order summary, material breakdown, entry list). It also restyles the Login page and Home stub built in the Foundation plan, since those currently sit at bare inline-style placeholders that would look jarring next to a styled app.

**Out of scope for this spec** (separate follow-up specs, matching the PRD's own phase breakdown):
- New/edit bio-mining entry form (PRD Phase 4)
- MRF log feed + new/edit MRF log with photo upload (PRD Phase 5)
- Offline queue UI (badges, sync states) — the queue *mechanism* was already designed in the Foundation design doc §5; only its UI surface is out of scope here
- Seed script (PRD Phase 7) — blocked on Deshik supplying real historical figures for Phase II, Phase III (both agencies), and MRF; Phase I's numbers are already in the PRD's acceptance criteria

## 2. Visual design system

A strict monochrome 1-bit aesthetic inspired by classic OS chrome — approved via two rounds of mockups in the visual companion (Home card layout, then the material-breakdown table).

**Tokens:**
- Colors: `#FFFFFF` background, `#000000` text/borders/primary chrome. `#282725` (warm dark grey) frames the viewport as a 16px bezel with 8px rounded corners. `#f37725` (orange) and `#3685c5` (blue) used sparingly — orange for the balance stat specifically (as mocked), blue for links, in-progress status chips, and interactive affordances like "view breakdown." Neither color has a confirmed rule for negative values yet (no mockup showed a negative balance) — treat that as an open question if it comes up during implementation, not a settled decision.
- Typography: **Courier Prime** (monospace, Google Font) for all OS-chrome elements — title bars, labels, status chips, table headers, stat labels. **Verdana** (system font, no load needed) for card titles and body content. Section heads 20px bold. Chrome text uses 0.02em letter-spacing, uppercase, 10–14px depending on role.
- Borders & corners: 1px solid black borders everywhere. 8px border-radius for "window" containers (cards, the screen itself). 4px for buttons/chips/checkboxes. 0px for plain layout containers (e.g. table rows).
- Dithering: a 4×4px alternating black/white checkerboard (CSS `repeating-linear-gradient` at two 45° angles, `background-size: 4px 4px`) used for decorative/status-adjacent fills — not for primary content backgrounds, which stay white.
- Effects: no shadows, no gradients, no transparency. Active/selected states invert colors (black background, white text) rather than using a highlight color.
- "Window" motif: every content block is a bordered container with a title bar (2 small circular "dots" + a Courier Prime label) — established in the Home card mockup and reused for every subsequent section (order summary, material breakdown, entry list).

**Implementation approach:** tokens are encoded as Tailwind v4 `@theme` CSS variables (colors, font families, border-radius scale, a `bg-dither` utility class) rather than hand-rolled CSS-module files or a reskinned component library (shadcn, etc.) — this builds directly on the Tailwind setup already scaffolded in the Foundation plan. A small shared component set implements the recurring pieces: `Window` (bordered container + title bar), `StatGrid` (label/value pairs), `Chip` (status/filter pill, supports `active` and color variants), `MaterialTable` (the primary-three + collapsible-others pattern below).

## 3. Home screen

Five project cards, each a `Window` component:
- Title bar: `PHASE {I/II/III} · {LOCATION}` for bio-mining projects (as built: `BIO-MINING · PHASE {I/II/III} · {LOCATION}`), `MRF PLANT · {LOCATION}` for the MRF row. *Agency and location traded places on 2026-09-21 — see Amendments.*
- Content row: agency (bold, Verdana) + last-updated date (small, Courier Prime) on the left; a right-aligned block with the stat and a status `Chip` (`COMPLETED` = black-filled chip, `IN PROGRESS` = blue-outlined chip).
- **No progress bar** — cumulative % of order is shown as a plain large stat (Courier Prime, bold, 24px), not a bar. This was an explicit correction during mockup review (first draft had a dithered bar; removed).
- **MRF's card has no stat at all** — it has no order-qty/% figure (its PRD scope is daily photos+notes only, no tonnage target). Its right-side stat area is empty; only the status chip and last-updated date show. (Decided over two alternatives — "days logged" and "days since last log" — both rejected in favor of just omitting the stat.)
- No combined Phase III total anywhere (Zigma and Card Box stay fully separate cards, per PRD).

## 4. Phase detail screen

Three stacked `Window` sections below a back-button top bar:

1. **Order summary** — a 2-column `StatGrid` (Order Qty / Cumulative Inward / Cumulative Disposed / Balance — balance rendered in orange), followed by a horizontal rule and a "hero" stat: the % of order figure large (32px Courier Prime bold) with "OF ORDER QTY" as a small label beside it.
2. **Material breakdown** — **not** all 11 materials at once. Domain call from Deshik: only **Soil, RDF, and Stones** are the materials anyone actually cares about at a glance. The table shows those three as individual rows, then a fourth **"Others"** row aggregating the remaining eight (Inert, Steel, Tyre, Wood, Glass, Iron scrap, Wires & cables, Others-the-material). The Others row has a `(view breakdown)` link (blue, Courier Prime) that expands eight indented sub-rows in place; tapping again collapses them. This is a real product decision, not just a mobile-space compromise — the three named materials are what matters operationally.
3. **Entries** — filter chips (`LAST 30D` active by default, `ALL TIME`, a date-range chip) above a newest-first list. Each entry row: date (bold) + shift (small, blue, Courier Prime — Zigma always shows `FULL DAY`, Card Box shows `DAY`/`NIGHT`) on the left; inward/disposed figures right-aligned in Courier Prime, inward in black, disposed in grey.

Both `phase_totals` and `phase_material_breakdown` (Foundation plan, already live) back this screen directly — no client-side summing. Per the Foundation design doc §10, `phase_material_breakdown` returns zero rows for a phase with no entries yet; the Material breakdown `Window` must handle that by showing all three primary rows at 0 MT / 0% and an empty (or hidden) Others row, not by erroring or showing nothing.

## 5. Login page & Home stub restyle

The Foundation plan's `app/login/page.tsx` and the role-conditional stub in `app/page.tsx` get restyled to match this system (bordered `Window` form, Courier Prime labels, same bezel/topbar chrome as every other screen) — no behavior changes, purely visual. `app/page.tsx` becomes the real Home screen described in §3, replacing the stub text; the role-conditional logic (Editor sees a placeholder for an eventual "Add" affordance, Viewer sees nothing) carries forward unchanged, since the Add button itself belongs to the entry-form spec (out of scope here).

## 6. Navigation

PRD specifies bottom navigation (mobile-first). Implemented as a bordered bar fixed to the bottom of the screen (`Chip`-style items, active tab color-inverted per the design system's active-state rule), respecting the safe-area-inset for PWA installed mode. Given the current scope, this ships as an inert single-item bar (Home) — MRF and any other bottom-nav destinations activate once their respective specs are built, rather than linking to not-yet-built screens.

## 7. Testing / verification

Same approach as the Foundation plan: no automated test suite (deliberate, per PRD/design-doc decision). Verification is manual — `npm run build` + `npm run dev` locally against real Supabase data (the live project already has schema/RLS/views from Foundation), then a phone check once this is deployed. Since Deshik asked to stay local-only for now, the phone/production-deploy check is deferred until he chooses to deploy again; local verification (desktop + a mobile-width browser emulation) is the gate for this spec.

## Amendments

### 2026-09-21 — Location sits in the card title bar, agency in the card body

Requested by Deshik: on the five Home cards the two names trade places. The window title bar
carries the **location** (`BIO-MINING · PHASE III · RAMAPURAM`, `MRF PLANT · THUKIVAKAM`) and the
bold body line carries the **agency** (`Zigma`, `Card Box`, `Raghuram Hume Pipes`). Nothing else
on the card moves — the last-updated date, the status `Chip`, and the in-progress-first ordering
are unchanged, and the card stays one tap target to the same destination.

- The title bar stays uppercase Courier Prime chrome text; the body line keeps the agency's own
  mixed case, the way `Ramapuram` read before the swap.
- The body line for Bio-Mining reads `phase_totals.agency` directly. The title bar looks the
  location up in `app/page.tsx`'s `LOCATION` map and falls back to the agency name when an agency
  has no location mapped, so a newly added agency can never render a dangling `·` in the title.
- Home cards only. The Phase detail and MRF `/mrf` **top bars** are untouched and still read
  `PHASE {I/II/III} · {AGENCY}` / `MRF PLANT · RAGHURAM HUME PIPES`.
