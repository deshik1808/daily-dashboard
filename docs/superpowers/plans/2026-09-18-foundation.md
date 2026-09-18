# Foundation (Scaffold, DB, Auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the non-visual foundation of the Project Status Dashboard — Next.js PWA scaffold, Supabase schema/RLS/totals views, and auth (login + route guard) — so Plan 2 can build the real screens against real data once Deshik supplies a design reference.

**Architecture:** Next.js 15 (App Router, TypeScript) deployed on Vercel, talking to a Supabase project (Postgres + Auth + Storage) via `@supabase/ssr`. Role is derived purely from Supabase session presence (authenticated = Editor, anonymous = Viewer) — no separate roles table. All bio-mining figures are stored as increments; two database views compute totals and per-material breakdowns at read time, per the PRD's "never store running totals" rule.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS (via `create-next-app` defaults) + `@supabase/ssr` + `@supabase/supabase-js` + `@ducanh2912/next-pwa`. Supabase (Postgres/Auth/Storage) + GitHub + Vercel.

## Global Constraints

- Mobile-first: every page must render correctly at 360–430px wide (spec §5). No page in this plan has final visual design yet — see the process gate below.
- RLS is the real security boundary: anonymous = read-only on every table, authenticated = read+write, DELETE is granted to nobody (soft delete only) (design doc §7, PRD §2).
- No service-role key in frontend code or `NEXT_PUBLIC_*` env vars (PRD §5).
- `phase_master` does **not** store a running `inward_qty_mt` column — cumulative inward is always `Σ inward_mt` from `bio_mining_entries`, computed in a view (PRD §3 "Computed" section takes precedence over the field table's phrasing; storing it separately would let it drift out of sync, violating "editing one wrong row must not corrupt anything else").
- **Process gate (design doc §9):** this plan builds scaffold/DB/auth only. Do not style, redesign, or add product screens (Home, Phase detail, entry forms, MRF log) — that is Plan 2, gated on Deshik's visual design reference. The login page and stub home page built here are intentionally bare/unstyled placeholders.
- Card Box `inward_mt` is filled per shift (both Day and Night rows carry their own value); Zigma has one shift (`Full day`) per date (design doc §3).

---

### Task 1: Scaffold Next.js app into the existing repo

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.eslintrc.json`, `.gitignore` (all via `create-next-app`)

**Interfaces:**
- Produces: a working `npm run dev` / `npm run build` Next.js App Router project at the repo root, alongside the existing `docs/` folder.

- [ ] **Step 1: Scaffold into a temp folder (repo root is non-empty because of `docs/`, which `create-next-app` won't run into)**

```bash
npx create-next-app@latest tmp-scaffold --typescript --tailwind --app --eslint --import-alias "@/*" --use-npm --no-src-dir
```

- [ ] **Step 2: Merge the scaffold into the repo root, keeping `docs/` untouched**

```bash
cp -a tmp-scaffold/. .
rm -rf tmp-scaffold
```

- [ ] **Step 3: Verify `docs/` survived the merge and the app builds**

```bash
ls docs/superpowers/specs
npm run build
```
Expected: the spec file is still listed, and the build finishes with no errors (default Next welcome page).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js App Router project (TypeScript, Tailwind)"
```

---

### Task 2: PWA shell — manifest, placeholder icons, service worker

**Files:**
- Create: `scripts/generate-placeholder-icons.mjs`
- Create: `public/manifest.json`
- Modify: `next.config.ts`
- Modify: `app/layout.tsx`
- Modify: `.gitignore` (add PWA build output)

**Interfaces:**
- Produces: an installable PWA shell. `public/icons/icon-192.png` and `public/icons/icon-512.png` exist and are referenced by `public/manifest.json`.

- [ ] **Step 1: Install the PWA plugin**

```bash
npm install @ducanh2912/next-pwa
```

- [ ] **Step 2: Write a dependency-free placeholder icon generator (no design system yet — solid brand-blue squares, swapped for real icons in Plan 2)**

```javascript
// scripts/generate-placeholder-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        t[n] = c >>> 0;
      }
      return t;
    })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function writeSolidPng(path, size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rowLen = size * 3 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }
  const idat = deflateSync(raw);
  const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
  writeFileSync(path, png);
}

mkdirSync("public/icons", { recursive: true });
const brand = [30, 64, 175];
writeSolidPng("public/icons/icon-192.png", 192, brand);
writeSolidPng("public/icons/icon-512.png", 512, brand);
console.log("Placeholder icons written to public/icons/");
```

- [ ] **Step 2: Run it and verify valid PNGs were written**

```bash
node scripts/generate-placeholder-icons.mjs
node -e "const b=require('fs').readFileSync('public/icons/icon-192.png'); console.log(b.length > 0 && b[0]===137 ? 'valid PNG' : 'INVALID')"
```
Expected: `valid PNG` printed, and `public/icons/icon-512.png` also exists.

- [ ] **Step 3: Write the manifest**

```json
// public/manifest.json
{
  "name": "Project Status Dashboard",
  "short_name": "Project Status",
  "description": "Daily progress tracker for Bio-Mining and MRF projects, Tirupati",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 4: Wrap Next config with the PWA plugin**

```typescript
// next.config.ts
import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
```

- [ ] **Step 5: Wire the manifest and PWA meta tags into the root layout**

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Ignore generated service worker files**

Append to `.gitignore`:
```
public/sw.js
public/workbox-*.js
public/sw.js.map
public/workbox-*.js.map
```

- [ ] **Step 7: Build and verify the manifest + service worker are emitted**

```bash
npm run build
ls public/sw.js public/manifest.json
```
Expected: both files listed, build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add PWA shell: manifest, placeholder icons, service worker"
```

---

### Task 3: Supabase project + client libraries + env vars

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `.env.local.example`
- Create: `.env.local` (gitignored — verify it's covered by the scaffold's default `.gitignore`)

**Interfaces:**
- Produces: `createClient()` (browser, from `lib/supabase/client.ts`) and `async createClient()` (server, from `lib/supabase/server.ts`), both returning a Supabase JS client typed against `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Create the Supabase project**

Use the Supabase MCP tool to list organizations, then create a project (free tier, region closest to Tirupati/India — `ap-south-1` if offered). Record the returned project ref and URL.

- [ ] **Step 2: Install client libraries**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Write the browser client**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Write the server client**

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Called from a Server Component render; middleware (Task 7) refreshes the session instead.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Write env var files**

```
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Fill `.env.local` with the real values: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase MCP project-URL/publishable-key tools. Ask Deshik to paste `SUPABASE_SERVICE_ROLE_KEY` into `.env.local` from the Supabase dashboard (Project Settings → API) — this secret isn't exposed through MCP tools by design, and it must never be typed into chat.

- [ ] **Step 6: Verify `.env.local` is gitignored**

```bash
git check-ignore .env.local
```
Expected: prints `.env.local` (confirms git will not track it).

- [ ] **Step 7: Verify the app builds with the clients in place**

```bash
npm run build
```
Expected: no errors (nothing imports these clients yet, so this is just a syntax/type check).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add Supabase client libraries and env var scaffolding"
```

---

### Task 4: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

**Interfaces:**
- Produces: tables `phase_master`, `bio_mining_entries`, `mrf_logs` with enums `phase_enum`, `agency_enum`, `phase_status_enum`, `shift_enum`. Partial unique indexes enforce "no duplicate (phase×agency, date, shift)" and "no duplicate MRF date" only among non-deleted rows.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_schema.sql
create type phase_enum as enum ('I', 'II', 'III');
create type agency_enum as enum ('Zigma', 'Card Box');
create type phase_status_enum as enum ('Completed', 'In progress');
create type shift_enum as enum ('Day', 'Night', 'Full day');

create table phase_master (
  id uuid primary key default gen_random_uuid(),
  phase phase_enum not null,
  agency agency_enum not null,
  order_qty_mt numeric(12,2) not null,
  status phase_status_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase, agency)
);

create table bio_mining_entries (
  id uuid primary key default gen_random_uuid(),
  phase_agency_id uuid not null references phase_master(id),
  report_date date not null,
  shift shift_enum not null,
  inward_mt numeric(12,2) not null default 0,
  soil_mt numeric(12,2),
  rdf_mt numeric(12,2),
  stones_mt numeric(12,2),
  inert_mt numeric(12,2),
  steel_mt numeric(12,2),
  tyre_mt numeric(12,2),
  wood_mt numeric(12,2),
  glass_mt numeric(12,2),
  iron_scrap_mt numeric(12,2),
  wires_cables_mt numeric(12,2),
  others_mt numeric(12,2),
  remarks text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index bio_mining_entries_unique_report
  on bio_mining_entries (phase_agency_id, report_date, shift)
  where deleted_at is null;

create table mrf_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  note text not null default '',
  photo_paths text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index mrf_logs_unique_date
  on mrf_logs (log_date)
  where deleted_at is null;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger phase_master_set_updated_at before update on phase_master
  for each row execute function set_updated_at();
create trigger bio_mining_entries_set_updated_at before update on bio_mining_entries
  for each row execute function set_updated_at();
create trigger mrf_logs_set_updated_at before update on mrf_logs
  for each row execute function set_updated_at();
```

- [ ] **Step 2: Apply it via the Supabase MCP `apply_migration` tool** (name: `0001_schema`, pass the SQL above).

- [ ] **Step 3: Verify the tables exist**

Use the Supabase MCP `list_tables` tool. Expected: `phase_master`, `bio_mining_entries`, `mrf_logs` all listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "Add bio-mining and MRF schema migration"
```

---

### Task 5: Row Level Security policies

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

**Interfaces:**
- Consumes: tables from Task 4.
- Produces: anonymous SELECT-only access on all three tables; authenticated INSERT/UPDATE; DELETE granted to no one (soft delete only, enforced by RLS default-deny).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_rls.sql
alter table phase_master enable row level security;
alter table bio_mining_entries enable row level security;
alter table mrf_logs enable row level security;

create policy phase_master_select on phase_master for select using (true);
create policy phase_master_insert on phase_master for insert to authenticated with check (true);
create policy phase_master_update on phase_master for update to authenticated using (true) with check (true);

create policy entries_select on bio_mining_entries for select using (true);
create policy entries_insert on bio_mining_entries for insert to authenticated with check (true);
create policy entries_update on bio_mining_entries for update to authenticated using (true) with check (true);

create policy mrf_logs_select on mrf_logs for select using (true);
create policy mrf_logs_insert on mrf_logs for insert to authenticated with check (true);
create policy mrf_logs_update on mrf_logs for update to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply it via the Supabase MCP `apply_migration` tool** (name: `0002_rls`).

- [ ] **Step 3: Verify with the security advisor**

Run the Supabase MCP `get_advisors` tool (type: `security`). Expected: no "RLS disabled" warnings for these three tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "Add RLS policies: anonymous read-only, authenticated read/write, no delete"
```

---

### Task 6: Totals views + end-to-end RLS verification

**Files:**
- Create: `supabase/migrations/0003_totals_view.sql`

**Interfaces:**
- Consumes: `phase_master`, `bio_mining_entries` from Task 4.
- Produces: view `phase_totals` (one row per phase×agency: `cumulative_inward_mt`, `cumulative_disposed_mt`, `balance_mt`, `pct_of_order`, `last_report_date`) and view `phase_material_breakdown` (one row per phase×agency×material: `disposed_mt`, `share_pct`). Later tasks (Plan 2) read from these views instead of summing rows client-side (NFR, PRD §5).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0003_totals_view.sql
create view phase_totals as
with entry_totals as (
  select
    phase_agency_id,
    sum(inward_mt) as inward_mt,
    sum(
      coalesce(soil_mt,0) + coalesce(rdf_mt,0) + coalesce(stones_mt,0) +
      coalesce(inert_mt,0) + coalesce(steel_mt,0) + coalesce(tyre_mt,0) +
      coalesce(wood_mt,0) + coalesce(glass_mt,0) + coalesce(iron_scrap_mt,0) +
      coalesce(wires_cables_mt,0) + coalesce(others_mt,0)
    ) as disposed_mt,
    max(report_date) as last_report_date
  from bio_mining_entries
  where deleted_at is null
  group by phase_agency_id
)
select
  pm.id as phase_agency_id,
  pm.phase,
  pm.agency,
  pm.order_qty_mt,
  pm.status,
  coalesce(et.inward_mt, 0)::numeric(12,2) as cumulative_inward_mt,
  coalesce(et.disposed_mt, 0)::numeric(12,2) as cumulative_disposed_mt,
  (coalesce(et.inward_mt, 0) - coalesce(et.disposed_mt, 0))::numeric(12,2) as balance_mt,
  case when pm.order_qty_mt = 0 then 0
    else round(coalesce(et.inward_mt, 0) / pm.order_qty_mt * 100, 2)
  end as pct_of_order,
  et.last_report_date
from phase_master pm
left join entry_totals et on et.phase_agency_id = pm.id;

create view phase_material_breakdown as
with materials as (
  select phase_agency_id, 'Soil' as material, coalesce(soil_mt,0) as qty_mt from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'RDF', coalesce(rdf_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Stones', coalesce(stones_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Inert', coalesce(inert_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Steel', coalesce(steel_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Tyre', coalesce(tyre_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Wood', coalesce(wood_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Glass', coalesce(glass_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Iron scrap', coalesce(iron_scrap_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Wires & cables', coalesce(wires_cables_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Others', coalesce(others_mt,0) from bio_mining_entries where deleted_at is null
),
totals as (
  select phase_agency_id, sum(qty_mt) as disposed_total from materials group by phase_agency_id
)
select
  m.phase_agency_id,
  m.material,
  sum(m.qty_mt)::numeric(12,2) as disposed_mt,
  case when t.disposed_total = 0 then 0
    else round(sum(m.qty_mt) / t.disposed_total * 100, 2)
  end as share_pct
from materials m
join totals t on t.phase_agency_id = m.phase_agency_id
group by m.phase_agency_id, m.material, t.disposed_total;
```

- [ ] **Step 2: Apply it via the Supabase MCP `apply_migration` tool** (name: `0003_totals_view`).

- [ ] **Step 3: Seed one throwaway phase row and verify the view computes correctly**

```sql
insert into phase_master (phase, agency, order_qty_mt, status)
values ('I', 'Zigma', 1000, 'Completed');

insert into bio_mining_entries (phase_agency_id, report_date, shift, inward_mt, soil_mt, rdf_mt)
select id, '2026-01-01', 'Full day', 100, 40, 30
from phase_master where phase = 'I' and agency = 'Zigma';

select cumulative_inward_mt, cumulative_disposed_mt, balance_mt, pct_of_order
from phase_totals
where phase = 'I' and agency = 'Zigma';
```
Expected: `cumulative_inward_mt = 100.00`, `cumulative_disposed_mt = 70.00`, `balance_mt = 30.00`, `pct_of_order = 10.00`. Run via the Supabase MCP `execute_sql` tool.

- [ ] **Step 4: Delete the throwaway rows (this is real production data storage, not a test DB)**

```sql
delete from bio_mining_entries where phase_agency_id in (select id from phase_master where phase = 'I' and agency = 'Zigma');
delete from phase_master where phase = 'I' and agency = 'Zigma';
```

- [ ] **Step 5: Verify anonymous writes are refused (PRD §7 acceptance criterion)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://<project-ref>.supabase.co/rest/v1/phase_master" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phase":"II","agency":"Zigma","order_qty_mt":100,"status":"Completed"}'
```
Expected: `401` (RLS blocks the insert — no `authenticated` role on the request).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_totals_view.sql
git commit -m "Add phase_totals and phase_material_breakdown views"
```

---

### Task 7: Auth — middleware, login page, role-conditional stub home

**Files:**
- Create: `middleware.ts`
- Create: `app/login/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/client.ts` (Task 3, browser), `createClient()` from `lib/supabase/server.ts` (Task 3, server).
- Produces: unauthenticated requests to `/entry/*` or `/mrf/new`/`/mrf/edit/*` (routes that don't exist until Plan 2, but the guard is in place now so those pages inherit protection automatically) redirect to `/login`. Home page shows different content for signed-in vs anonymous visitors.

- [ ] **Step 1: Write the middleware**

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const EDITOR_ONLY_PREFIXES = ["/entry", "/mrf/new", "/mrf/edit"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isEditorOnlyPath = EDITOR_ONLY_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isEditorOnlyPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
```

- [ ] **Step 2: Write the login page (unstyled placeholder — see process gate)**

```tsx
// app/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <main style={{ padding: 24, maxWidth: 360, margin: "0 auto" }}>
      <h1>Editor login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Update the home page to be role-conditional (stub — real 5-card layout is Plan 2)**

```tsx
// app/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 24 }}>
      <h1>Project Status Dashboard</h1>
      <p>Signed in as: {user ? user.email : "Viewer (not signed in)"}</p>
      {user ? (
        <p>Editor view — Add button and project cards land here in Plan 2.</p>
      ) : (
        <p>
          <Link href="/login">Editor login</Link>
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Build and manually verify both states**

```bash
npm run build
npm run start
```
Visit `http://localhost:3000` in an incognito/private window: should show "Viewer (not signed in)" with an Editor login link. This is verified for real with a live account in Task 8.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add auth: middleware route guard, login page, role-conditional home stub"
```

---

### Task 8: Create the Editor account

**Files:** none (Supabase Auth admin API call only)

**Interfaces:**
- Consumes: `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (Task 3).
- Produces: one Supabase Auth user for Deshik, confirmed, with no password known to this session — he sets it himself via a reset-password email.

- [ ] **Step 1: Create the user via the GoTrue admin API (random unknown password, immediately unused)**

```bash
curl -s -X POST "https://<project-ref>.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"deshik1808@gmail.com","email_confirm":true}'
```
Expected: `200` with a user object containing an `id`.

- [ ] **Step 2: Trigger a password-reset email so Deshik sets his own password (never typed into this session)**

```bash
curl -s -X POST "https://<project-ref>.supabase.co/auth/v1/recover" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"deshik1808@gmail.com"}'
```
Expected: `200` (empty body). Tell Deshik to check his inbox and set a password.

- [ ] **Step 3: Once he confirms, verify signed-in writes succeed and duplicates are rejected (PRD §7 acceptance criteria)**

After Deshik logs in once via `/login` in a real browser (so we have a valid session to test with), run:
```sql
-- as the authenticated user, via the app's own session — not via execute_sql (which runs privileged)
```
Practically: from the running app, sign in, then in the browser console or via a temporary test insert through the app confirm a `phase_master` row insert succeeds, and inserting the same `(phase_agency_id, report_date, shift)` twice returns a unique-violation error surfaced by Supabase. (Full entry-form UI for this is Plan 2 — for now, confirm via the Supabase Table Editor while signed in, or defer this specific check to Plan 2's entry-form task where it has a real UI to exercise.)

- [ ] **Step 4: No commit** (no files changed — this task is infra-only)

---

### Task 9: GitHub repo + Vercel deploy

**Files:** none (repo/hosting provisioning only)

**Interfaces:**
- Produces: a GitHub remote for this repo at `https://github.com/deshik1808/daily-dashboard.git`, and a Vercel project auto-deploying on push to `master` (production) or any other branch (preview), with the three Supabase env vars configured in Vercel. Pushing `foundation` now produces a preview deployment, not production — production only happens once `master` itself is updated at branch-finish time.

- [ ] **Step 1: Check for GitHub CLI auth**

```bash
gh auth status
```
If authenticated, continue. If not, tell Deshik to run `gh auth login`, or push manually and skip to Step 3.

- [ ] **Step 2: Point at the repo Deshik designated — create it if it doesn't exist yet, otherwise just add the remote**

```bash
gh repo view deshik1808/daily-dashboard >/dev/null 2>&1 && echo EXISTS || echo MISSING
```
If `MISSING`:
```bash
gh repo create deshik1808/daily-dashboard --private --source=. --remote=origin
```
If `EXISTS`:
```bash
git remote add origin https://github.com/deshik1808/daily-dashboard.git
```

- [ ] **Step 3: Push the `foundation` branch (not `master`)**

This plan is being executed on an isolated `foundation` branch/worktree precisely so `master` stays clean until the final whole-branch review passes. Push the branch itself, not `master` — the merge into `master` (and the push that actually triggers Vercel's production deploy) happens later, via `finishing-a-development-branch`, after all 10 tasks are reviewed.

```bash
git push -u origin foundation
```

- [ ] **Step 3: Create the Vercel project linked to the GitHub repo**

Use the Vercel MCP `create_git_project` tool pointing at the new GitHub repo, in the appropriate team (ask Deshik which team/account if more than one is returned by `list_teams`).

- [ ] **Step 4: Set environment variables on Vercel**

Use the Vercel MCP tools to set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (the last one Production/Preview only, never exposed client-side — it's a plain env var, not `NEXT_PUBLIC_*`, so Next.js never bundles it into client code).

- [ ] **Step 5: Trigger and verify the first deploy**

Use the Vercel MCP `get_deployment` / `get_deployment_build_logs` tools after the push-triggered deploy starts. Expected: build succeeds, deployment status `READY`. This will be a **preview** deployment (triggered by the `foundation` branch push, not `master`) — that's expected at this stage; production deploy happens once `master` is updated at branch-finish time.

- [ ] **Step 6: No commit** (no files changed — this task is infra-only)

---

### Task 10: Manual phone verification checkpoint

**Files:** none

- [ ] **Step 1: Ask Deshik to verify on his Android phone, against the Vercel URL:**
  - App installs to home screen from Chrome's "Add to Home Screen" prompt (PRD §7)
  - Opening the installed app shows the Home stub with no browser address bar
  - Visiting without signing in shows "Viewer (not signed in)" and an Editor login link, no write controls
  - Signing in via `/login` with his own (self-set) password succeeds and the home page then shows the Editor view text

- [ ] **Step 2: Do not proceed to Plan 2 until Deshik confirms all four checks pass and has shared a visual design reference**, per the process gate in the design doc (§9).
