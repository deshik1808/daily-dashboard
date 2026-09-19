# Home & Phase Detail (Design System + Read-Only Screens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 1-bit design system (tokens + shared components) and the two read-only screens that prove it out — Home (5 project cards) and Phase detail (order summary, material breakdown, entry list) — replacing the Foundation plan's unstyled placeholders.

**Architecture:** Tailwind v4 CSS-first theme tokens (`@theme`/`@utility` in `app/globals.css`) define the design language once; a small shared component set (`Window`, `TopBar`, `BottomNav`, `Chip`, `StatGrid`, `MaterialTable`) implements the recurring visual patterns. Home and Phase detail are Next.js Server Components reading directly from the Foundation plan's `phase_totals`/`phase_material_breakdown` views and `bio_mining_entries`/`mrf_logs` tables — no client-side total-summing.

**Tech Stack:** Next.js 16 (App Router, Server Components), Tailwind CSS v4, `next/font/google` (Courier Prime), existing Supabase client libraries from the Foundation plan.

## Global Constraints

- Fixed monochrome aesthetic — not a light/dark-mode-adaptive design. Remove the existing `@media (prefers-color-scheme: dark)` block in `app/globals.css`; this app always renders the same way regardless of system theme.
- Colors: `#FFFFFF` (paper/background), `#000000` (ink/text/borders), `#282725` (bezel), `#f37725` (orange accent — balance stat only, per design spec), `#3685c5` (blue accent — links, in-progress chips, interactive affordances).
- Typography: Courier Prime (loaded via `next/font/google`) for all OS-chrome text (title bars, labels, chips, table headers). Verdana as the content font (system font, `Verdana, Geneva, sans-serif` — Android/Linux browsers without Verdana installed will fall back to the browser's default sans-serif; this is an accepted limitation of naming a Microsoft-licensed font, not a bug to fix here).
- Borders/corners: 1px solid black borders everywhere. 8px radius for window/screen containers (`rounded-window`). 4px radius for buttons/chips/inputs (`rounded-control`). No shadows, no gradients, no transparency.
- The whole app is wrapped in a 16px `#282725` bezel with 8px rounded corners around a white "screen" — this is a permanent visual frame around every page, applied once in the root layout, not per-page.
- Totals (`phase_totals`, `phase_material_breakdown`) are read directly from the Foundation plan's database views — never summed from raw rows in application code. (Per-entry disposed-total display in the entry list is a per-row value, not an aggregate total, and is fine to compute from that single row's columns — this does not violate the "no client-side summing of totals" rule, which is about the phase-level aggregates.)
- Material breakdown shows exactly three named rows — **Soil, RDF, Stones** (matching the `material` values written by `0003_totals_view.sql`'s unpivot exactly: `'Soil'`, `'RDF'`, `'Stones'`) — plus one aggregated **Others** row for the remaining eight materials, with a tap-to-expand breakdown. This is a deliberate product decision (Deshik: "only three important categories"), not a mobile-space compromise.
- Date filter on Phase detail implements exactly two states — **Last 30 days** (default) and **All time** — per the PRD's explicit acceptance criteria. A custom date-range picker is out of scope for this plan (the brainstorming mockup showed a placeholder chip for it, but the PRD only requires these two states as v1 acceptance criteria).
- MRF's Home card has no % stat (MRF has no order-qty concept) and is not a link — its detail screen (the MRF log feed) is a separate, not-yet-built spec. Its metadata (title, agency, location) is hardcoded in the Home page; only its "last updated" date is a live query against `mrf_logs`.
- No automated test suite (deliberate project-wide decision, from the Foundation design doc). Verification is: `npm run build` succeeding, and using the Claude Browser tool against `npm run dev` at a mobile viewport (375×812) to visually confirm each screen — this is the test gate for every task in this plan.
- Deployment/production verification is out of scope for this plan (per Deshik: local-only for now) — but implementation still happens on an isolated worktree/branch per the usual process, merged back once reviewed. Commit frequently, verify the build after every task.

---

### Task 1: Design tokens, font loading, and the bezel/screen shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: Tailwind utilities `bg-paper`, `bg-ink`, `bg-bezel`, `text-ink`, `text-accent-orange`, `text-accent-blue`, `border-accent-blue`, `rounded-window`, `rounded-control`, a `font-mono` stack resolving to Courier Prime, and a `bg-dither` utility (4px checkerboard). Every subsequent task's components use these utility names — keep them exact.

- [ ] **Step 1: Replace the theme tokens in `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-paper: #ffffff;
  --color-ink: #000000;
  --color-bezel: #282725;
  --color-accent-orange: #f37725;
  --color-accent-blue: #3685c5;

  --font-mono: var(--font-courier-prime), ui-monospace, monospace;
  --font-sans: Verdana, Geneva, sans-serif;

  --radius-window: 8px;
  --radius-control: 4px;
}

@utility bg-dither {
  background-image:
    linear-gradient(45deg, #000 25%, transparent 25%),
    linear-gradient(-45deg, #000 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #000 75%),
    linear-gradient(-45deg, transparent 75%, #000 75%);
  background-size: 4px 4px;
  background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
}

body {
  background: var(--color-bezel);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

This removes the old `--background`/`--foreground` variables, the Geist font references (Geist was never actually loaded after Task 2 of the Foundation plan removed the font imports — those `@theme inline` lines were dead), and the `prefers-color-scheme: dark` block (per Global Constraints — this design doesn't adapt to system theme).

- [ ] **Step 2: Load Courier Prime and add the bezel/screen shell in `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { Courier_Prime } from "next/font/google";
import "./globals.css";

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
});

export const metadata: Metadata = {
  title: "Project Status Dashboard",
  description: "Daily progress tracker for Bio-Mining and MRF projects, Tirupati",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Project Status",
  },
};

export const viewport: Viewport = {
  themeColor: "#282725",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={courierPrime.variable}>
      <body className="antialiased">
        <div
          className="fixed inset-0 flex flex-col bg-bezel"
          style={{
            padding:
              "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-window border border-ink bg-paper">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
```

Note: `themeColor` changed from the Foundation plan's placeholder blue (`#1e40af`) to the real bezel color (`#282725`), since the browser chrome color should now match the actual design.

- [ ] **Step 3: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors. (The existing pages — `app/page.tsx`, `app/login/page.tsx` — will render inside the new bezel/screen shell with their old unstyled content until Tasks 5–7 restyle them; that's expected at this point, not a bug.)

- [ ] **Step 4: Visual sanity check**

Start the dev server (`npm run dev`), use the Claude Browser tool to resize to a mobile preset (375×812), navigate to `http://localhost:3000`, and take a screenshot. Expected: a dark warm-grey frame around a white rounded rectangle filling most of the screen — confirms the bezel/screen shell renders correctly even before the content inside is restyled.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "Add design tokens, Courier Prime font, and bezel/screen shell"
```

---

### Task 2: `Window` and `Chip` components

**Files:**
- Create: `components/design/Window.tsx`
- Create: `components/design/Chip.tsx`

**Interfaces:**
- Consumes: Tailwind utilities from Task 1 (`rounded-window`, `rounded-control`, `font-mono`, `text-accent-blue`).
- Produces: `Window({ title: string, children: React.ReactNode })` — a bordered container with a title bar (two dots + label). `Chip({ children: React.ReactNode, variant?: "default" | "done" | "progress", active?: boolean })` — a small bordered pill; `variant="done"` is filled black, `variant="progress"` is blue-outlined, `active` (used for filter chips, ignores `variant`) is filled black. Both are used starting in Task 5.

- [ ] **Step 1: Write `Window`**

```tsx
// components/design/Window.tsx
export function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-window border border-ink">
      <div className="flex items-center gap-2 border-b border-ink px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide">
        <span className="flex gap-1">
          <span className="h-[7px] w-[7px] rounded-full border border-ink" />
          <span className="h-[7px] w-[7px] rounded-full border border-ink" />
        </span>
        <span>{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Write `Chip`**

```tsx
// components/design/Chip.tsx
type ChipVariant = "default" | "done" | "progress";

export function Chip({
  children,
  variant = "default",
  active = false,
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
  active?: boolean;
}) {
  const variantClass: Record<ChipVariant, string> = {
    default: "border-ink",
    done: "border-ink bg-ink text-paper",
    progress: "border-accent-blue text-accent-blue",
  };
  const classes = active
    ? "border-ink bg-ink text-paper"
    : variantClass[variant];

  return (
    <span
      className={`inline-block rounded-control border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${classes}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors. (Nothing imports these components yet — this is a syntax/type check only.)

- [ ] **Step 4: Commit**

```bash
git add components/design/Window.tsx components/design/Chip.tsx
git commit -m "Add Window and Chip design components"
```

---

### Task 3: `TopBar`, `BottomNav`, `StatGrid` components

**Files:**
- Create: `components/design/TopBar.tsx`
- Create: `components/design/BottomNav.tsx`
- Create: `components/design/StatGrid.tsx`

**Interfaces:**
- Produces: `TopBar({ title: string, showBack?: boolean })` (back link always points to `/`), `BottomNav({ active: "home" })`, `StatGrid({ stats: { label: string, value: string, accent?: boolean }[] })`. Used starting in Task 5.

- [ ] **Step 1: Write `TopBar`**

```tsx
// components/design/TopBar.tsx
import Link from "next/link";

export function TopBar({ title, showBack = false }: { title: string; showBack?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink px-3 py-2.5 font-mono text-sm font-bold tracking-wide">
      {showBack ? (
        <Link
          href="/"
          aria-label="Back"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-control border border-ink"
        >
          &lt;
        </Link>
      ) : (
        <span className="h-3 w-3 bg-dither" aria-hidden />
      )}
      <span className="flex-1">{title}</span>
    </div>
  );
}
```

- [ ] **Step 2: Write `BottomNav`**

```tsx
// components/design/BottomNav.tsx
import Link from "next/link";

export function BottomNav({ active }: { active: "home" }) {
  return (
    <div
      className="flex border-t border-ink font-mono text-xs tracking-wide"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Link
        href="/"
        className={`flex-1 py-2.5 text-center ${active === "home" ? "bg-ink text-paper" : ""}`}
      >
        HOME
      </Link>
    </div>
  );
}
```

`active` only accepts `"home"` for now (deliberately — this plan ships exactly one navigable destination; the type widens when the MRF log spec adds a second tab).

- [ ] **Step 3: Write `StatGrid`**

```tsx
// components/design/StatGrid.tsx
export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; accent?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-mono text-[10px] tracking-wide text-ink/70">{s.label}</div>
          <div className={`mt-0.5 text-[17px] font-bold ${s.accent ? "text-accent-orange" : ""}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/design/TopBar.tsx components/design/BottomNav.tsx components/design/StatGrid.tsx
git commit -m "Add TopBar, BottomNav, and StatGrid design components"
```

---

### Task 4: `MaterialTable` component

**Files:**
- Create: `components/design/MaterialTable.tsx`

**Interfaces:**
- Consumes: rows shaped like the Foundation plan's `phase_material_breakdown` view output: `{ material: string, disposed_mt: number, share_pct: number }`.
- Produces: `MaterialTable({ rows: MaterialRow[] })` and the exported type `MaterialRow`. Used in Task 6.

- [ ] **Step 1: Write the component**

```tsx
// components/design/MaterialTable.tsx
"use client";

import { useState } from "react";

export type MaterialRow = { material: string; disposed_mt: number; share_pct: number };

const PRIMARY = ["Soil", "RDF", "Stones"];

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MaterialTable({ rows }: { rows: MaterialRow[] }) {
  const [expanded, setExpanded] = useState(false);

  const primaryRows = PRIMARY.map(
    (name) => rows.find((r) => r.material === name) ?? { material: name, disposed_mt: 0, share_pct: 0 }
  );
  const otherRows = rows.filter((r) => !PRIMARY.includes(r.material));
  const othersTotal = otherRows.reduce((sum, r) => sum + r.disposed_mt, 0);
  const othersShare = otherRows.reduce((sum, r) => sum + r.share_pct, 0);

  return (
    <table className="w-full border-collapse font-mono text-xs">
      <thead>
        <tr className="border-b border-ink text-left text-[10px] tracking-wide">
          <th className="pb-1.5 font-normal">MATERIAL</th>
          <th className="pb-1.5 text-right font-normal">MT</th>
          <th className="pb-1.5 text-right font-normal">SHARE</th>
        </tr>
      </thead>
      <tbody>
        {primaryRows.map((r) => (
          <tr key={r.material} className="border-b border-ink/20">
            <td className="py-1.5">{r.material}</td>
            <td className="py-1.5 text-right">{fmt(r.disposed_mt)}</td>
            <td className="py-1.5 text-right">{r.share_pct.toFixed(1)}%</td>
          </tr>
        ))}
        <tr
          className="cursor-pointer border-b border-ink/20 italic"
          onClick={() => setExpanded((e) => !e)}
        >
          <td className="py-1.5">
            Others{" "}
            <span className="text-accent-blue">({expanded ? "hide" : "view breakdown"})</span>
          </td>
          <td className="py-1.5 text-right">{fmt(othersTotal)}</td>
          <td className="py-1.5 text-right">{othersShare.toFixed(1)}%</td>
        </tr>
        {expanded &&
          otherRows.map((r) => (
            <tr key={r.material} className="text-[11px] text-ink/70">
              <td className="py-1 pl-3.5">{r.material}</td>
              <td className="py-1 text-right">{fmt(r.disposed_mt)}</td>
              <td className="py-1 text-right">{r.share_pct.toFixed(1)}%</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify with sample data**

The design doc requires this to behave correctly for a phase with zero entries (empty `rows` array) — verify by hand:
```bash
node -e "
const PRIMARY = ['Soil', 'RDF', 'Stones'];
const rows = [];
const primaryRows = PRIMARY.map((name) => rows.find((r) => r.material === name) ?? { material: name, disposed_mt: 0, share_pct: 0 });
const otherRows = rows.filter((r) => !PRIMARY.includes(r.material));
console.log(JSON.stringify(primaryRows), otherRows.length);
"
```
Expected: `[{"material":"Soil","disposed_mt":0,"share_pct":0},{"material":"RDF","disposed_mt":0,"share_pct":0},{"material":"Stones","disposed_mt":0,"share_pct":0}] 0` — confirms the empty-phase case renders three zero rows and an empty (zero-value) Others row rather than erroring.

- [ ] **Step 3: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/design/MaterialTable.tsx
git commit -m "Add MaterialTable component (Soil/RDF/Stones + collapsible Others)"
```

---

### Task 5: Generate Supabase types, and build the Home screen (real data)

**Files:**
- Create: `lib/supabase/database.types.ts`
- Modify: `lib/supabase/client.ts`
- Modify: `lib/supabase/server.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Foundation plan), `Window`/`Chip`/`TopBar`/`BottomNav` (Tasks 2–3), the live `phase_totals` view and `mrf_logs` table (Foundation plan).
- Produces: a generated `Database` type (from `lib/supabase/database.types.ts`) that both Supabase client factories are parameterized with — Task 6 reuses this same generated file without regenerating it, since the schema hasn't changed since this task. The real Home screen — later tasks (a future MRF spec) will add a link from the MRF card once its detail page exists.

This task also closes a gap from the Foundation plan: `lib/supabase/client.ts`/`server.ts` currently return untyped clients, so every query result is `any`. AGENTS.md requires "strict TypeScript schemas matching Supabase database definitions" — generating real types from the live schema (rather than hand-writing interfaces that can drift) is how this task satisfies that.

- [ ] **Step 1: Generate types from the live schema**

Use the Supabase MCP `generate_typescript_types` tool against project ref `yycyaqubrjehqpikaaeo`, and save its output verbatim to `lib/supabase/database.types.ts`.

- [ ] **Step 2: Parameterize both Supabase clients with the generated `Database` type**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render; proxy (Task 7 of the Foundation plan) refreshes the session instead.
          }
        },
      },
    }
  );
}
```

(Only the `createBrowserClient`/`createServerClient` calls change — add the `<Database>` generic and the import. Everything else in both files stays exactly as the Foundation plan left it.)

- [ ] **Step 3: Verify the generated types actually narrow query results**

```bash
npx tsc --noEmit
```
Expected: no errors (confirms `database.types.ts` is syntactically valid TypeScript and both client files still type-check with the new generic).

- [ ] **Step 4: Replace `app/page.tsx`**

```tsx
// app/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { Chip } from "@/components/design/Chip";

const LOCATION: Record<string, string> = {
  Zigma: "Ramapuram",
  "Card Box": "Ramapuram",
};

function formatDate(d: string | null) {
  if (!d) return "no reports yet";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: phases } = await supabase
    .from("phase_totals")
    .select("phase_agency_id, phase, agency, status, pct_of_order, last_report_date")
    .order("phase", { ascending: true });

  const { data: mrfLatest } = await supabase
    .from("mrf_logs")
    .select("log_date")
    .is("deleted_at", null)
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex h-full flex-col">
      <TopBar title="PROJECT STATUS" />
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {!user && (
          <p className="mb-1 font-mono text-xs">
            <Link href="/login" className="text-accent-blue">
              EDITOR LOGIN
            </Link>
          </p>
        )}

        {(phases ?? []).map((p) => (
          <Link key={p.phase_agency_id} href={`/phase/${p.phase_agency_id}`}>
            <Window title={`BIO-MINING · PHASE ${p.phase} · ${p.agency.toUpperCase()}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-bold">{LOCATION[p.agency] ?? ""}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-ink/60">
                    UPD. {formatDate(p.last_report_date).toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold">{Math.round(p.pct_of_order)}%</div>
                  <Chip variant={p.status === "Completed" ? "done" : "progress"}>
                    {p.status.toUpperCase()}
                  </Chip>
                </div>
              </div>
            </Window>
          </Link>
        ))}

        <Window title="MRF PLANT · RAGHURAM HUME">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold">Thukivakam</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink/60">
                UPD. {formatDate(mrfLatest?.log_date ?? null).toUpperCase()}
              </div>
            </div>
            <Chip variant="progress">IN PROGRESS</Chip>
          </div>
        </Window>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
```

Note: `phases` will be an empty array until Deshik's seed script (PRD Phase 7, still blocked on real historical figures) runs — an empty Home screen with just the MRF card is the correct, expected state until then, not a bug.

- [ ] **Step 5: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 6: Visual verification**

Start `npm run dev`, use the Claude Browser tool at 375×812, navigate to `http://localhost:3000`. Since the database has no `phase_master` rows yet (seeding is a separate, blocked task), expect to see: the bezel/screen shell, the top bar reading "PROJECT STATUS", an "EDITOR LOGIN" link (not signed in), and exactly one card — "MRF PLANT · RAGHURAM HUME" showing "Thukivakam", an "IN PROGRESS" chip, and "UPD. NO REPORTS YET" (no MRF logs exist yet either). Confirm no layout overflow at this width and the bottom nav "HOME" tab is inverted (black background).

To verify the phase-card rendering path itself (since there's no seed data), temporarily insert one throwaway `phase_master` row via the Supabase MCP `execute_sql` tool, reload, confirm a card renders correctly, then delete the throwaway row (this is the live production database — clean up fully, same discipline as the Foundation plan's Task 6).

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx lib/supabase/database.types.ts lib/supabase/client.ts lib/supabase/server.ts
git commit -m "Generate Supabase types and build real Home screen (phase_totals + MRF)"
```

---

### Task 6: Phase detail screen

**Files:**
- Create: `app/phase/[id]/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Foundation plan), `Window`/`TopBar`/`BottomNav`/`StatGrid` (Tasks 2–3), `MaterialTable`/`MaterialRow` (Task 4), the `phase_totals` and `phase_material_breakdown` views and `bio_mining_entries` table (Foundation plan).

- [ ] **Step 1: Write the page**

```tsx
// app/phase/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { StatGrid } from "@/components/design/StatGrid";
import { MaterialTable, type MaterialRow } from "@/components/design/MaterialTable";

function fmtMT(n: number | null) {
  return (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function PhaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  const isAllTime = range === "all";

  const supabase = await createClient();

  const { data: phase } = await supabase
    .from("phase_totals")
    .select("*")
    .eq("phase_agency_id", id)
    .maybeSingle();

  if (!phase) notFound();

  const { data: materials } = await supabase
    .from("phase_material_breakdown")
    .select("material, disposed_mt, share_pct")
    .eq("phase_agency_id", id);

  let entriesQuery = supabase
    .from("bio_mining_entries")
    .select(
      "id, report_date, shift, inward_mt, soil_mt, rdf_mt, stones_mt, inert_mt, steel_mt, tyre_mt, wood_mt, glass_mt, iron_scrap_mt, wires_cables_mt, others_mt"
    )
    .eq("phase_agency_id", id)
    .is("deleted_at", null)
    .order("report_date", { ascending: false });

  if (!isAllTime) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    entriesQuery = entriesQuery.gte("report_date", thirtyDaysAgo.toISOString().slice(0, 10));
  }

  const { data: entries } = await entriesQuery;

  return (
    <div className="flex h-full flex-col">
      <TopBar title={`PHASE ${phase.phase} · ${phase.agency.toUpperCase()}`} showBack />
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        <Window title="ORDER SUMMARY">
          <StatGrid
            stats={[
              { label: "ORDER QTY", value: fmtMT(phase.order_qty_mt) },
              { label: "CUM. INWARD", value: fmtMT(phase.cumulative_inward_mt) },
              { label: "CUM. DISPOSED", value: fmtMT(phase.cumulative_disposed_mt) },
              { label: "BALANCE", value: fmtMT(phase.balance_mt), accent: true },
            ]}
          />
          <div className="mt-2.5 flex items-baseline justify-between border-t border-ink pt-2.5">
            <span className="font-mono text-3xl font-bold">{Math.round(phase.pct_of_order)}%</span>
            <span className="font-mono text-[11px] text-ink/60">OF ORDER QTY</span>
          </div>
        </Window>

        <Window title="MATERIAL BREAKDOWN">
          <MaterialTable rows={(materials ?? []) as MaterialRow[]} />
        </Window>

        <Window title="ENTRIES">
          <div className="mb-2.5 flex gap-1.5">
            <Link
              href={`/phase/${id}`}
              className={`rounded-control border border-ink px-2 py-1 font-mono text-[10px] ${
                !isAllTime ? "bg-ink text-paper" : ""
              }`}
            >
              LAST 30D
            </Link>
            <Link
              href={`/phase/${id}?range=all`}
              className={`rounded-control border border-ink px-2 py-1 font-mono text-[10px] ${
                isAllTime ? "bg-ink text-paper" : ""
              }`}
            >
              ALL TIME
            </Link>
          </div>

          {(entries ?? []).length === 0 && (
            <p className="font-mono text-xs text-ink/60">No entries in this range.</p>
          )}

          {(entries ?? []).map((e) => {
            const disposed =
              (e.soil_mt ?? 0) +
              (e.rdf_mt ?? 0) +
              (e.stones_mt ?? 0) +
              (e.inert_mt ?? 0) +
              (e.steel_mt ?? 0) +
              (e.tyre_mt ?? 0) +
              (e.wood_mt ?? 0) +
              (e.glass_mt ?? 0) +
              (e.iron_scrap_mt ?? 0) +
              (e.wires_cables_mt ?? 0) +
              (e.others_mt ?? 0);
            return (
              <div
                key={e.id}
                className="flex items-center justify-between border-b border-ink/20 py-2 last:border-b-0"
              >
                <div>
                  <div className="text-sm font-bold">
                    {new Date(e.report_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="font-mono text-[10px] text-accent-blue">
                    {e.shift.toUpperCase()}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>IN {fmtMT(e.inward_mt)}</div>
                  <div className="text-ink/50">OUT {fmtMT(disposed)}</div>
                </div>
              </div>
            );
          })}
        </Window>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
```

This per-entry `disposed` sum is a row-level display value (one entry's own material columns), not a phase-level total — it does not violate the "totals come from the database view" constraint, which governs the aggregate figures in the Order Summary window (those come straight from `phase.cumulative_disposed_mt`, computed by the view).

- [ ] **Step 2: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Visual verification with real data**

Since there's no seed data yet, use the Supabase MCP `execute_sql` tool to insert one throwaway `phase_master` row plus two `bio_mining_entries` rows (different `report_date`s, spread across today and 40 days ago, so the 30-day filter has something to exclude). Start `npm run dev`, use the Claude Browser tool at 375×812, navigate to `/phase/<the throwaway id>`. Confirm: order summary stats render, the material table shows Soil/RDF/Stones + an Others row that expands on tap, "LAST 30D" is active by default and hides the 40-day-old entry, clicking "ALL TIME" shows both entries. Then delete the throwaway rows via `execute_sql` and confirm (re-query) they're gone — same production-database discipline as the Foundation plan.

- [ ] **Step 4: Commit**

```bash
git add app/phase
git commit -m "Add Phase detail screen (order summary, material breakdown, entry list)"
```

---

### Task 7: Restyle the login page

**Files:**
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (browser client, Foundation plan), `TopBar`/`Window` (Tasks 2–3). No behavior change — same `signInWithPassword` call and redirect logic as the Foundation plan.

Deliberately does **not** render `BottomNav` — login is an auth gate outside the main app navigation, not a tab destination, so it doesn't get the bottom nav bar the way Home and Phase detail do.

- [ ] **Step 1: Replace `app/login/page.tsx`**

```tsx
// app/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title="EDITOR LOGIN" showBack />
      <div className="flex-1 overflow-y-auto p-3">
        <Window title="SIGN IN">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="font-mono text-[10px] tracking-wide">
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-control border border-ink px-2 py-1.5 text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="password" className="font-mono text-[10px] tracking-wide">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-control border border-ink px-2 py-1.5 text-[15px]"
              />
            </div>
            {error && (
              <p role="alert" className="font-mono text-xs text-accent-orange">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-control border border-ink bg-ink py-2 font-mono text-xs font-bold tracking-wide text-paper disabled:opacity-50"
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>
        </Window>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build succeeds**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Visual + functional verification**

Start `npm run dev`, use the Claude Browser tool at 375×812, navigate to `/login`. Confirm the styled form renders correctly inside the bezel/screen shell. Then actually sign in with Deshik's Editor credentials (he set his own password via the Foundation plan's reset-password email) and confirm: redirect to `/` succeeds, the "EDITOR LOGIN" link is now gone from Home (since `user` is now truthy).

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx
git commit -m "Restyle login page to match the design system"
```

---

### Task 8: Full-flow verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full build check**

```bash
npm run build
```
Expected: no errors, all routes (`/`, `/login`, `/phase/[id]`) listed in the route table.

- [ ] **Step 2: Auth guard regression check**

Confirm the Foundation plan's `proxy.ts` route guard still works unchanged — this plan didn't touch it, but verify nothing in the new pages broke it. Using the Claude Browser tool, in an unauthenticated context, navigate to `/entry` and confirm it still redirects to `/login` (307), matching the Foundation plan's Task 7 behavior.

- [ ] **Step 3: End-to-end visual pass at mobile width**

Using the Claude Browser tool at 375×812: visit `/` signed out (confirm login link + MRF card), sign in via `/login`, visit `/` signed in (confirm login link is gone), insert one throwaway phase + a couple of entries via Supabase MCP `execute_sql`, visit its `/phase/[id]` (confirm all three windows render, material breakdown expand/collapse works, date filter toggles work), then clean up the throwaway data and confirm via a fresh `execute_sql` count query that the tables are back to their prior row counts.

- [ ] **Step 4: No commit** (verification only — if any issue surfaces, fix it in a follow-up commit and re-run this task's steps)
