# MEMORY.md — Project Memory & Architecture Context

## Project Overview
**Project**: Project Status Dashboard (Bio-Mining & MRF, Tirupati)
**Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Auth + Database + Storage)

## Core Domain & Context
- **Roles**:
  - **Editor**: Deshik (full administrative and logging access across all projects and app settings)
  - **Viewer**: Superior (read-only view access across all projects, WhatsApp reply pill)
  - **Operator**: Field operator (agency-scoped: Card Box only; can create/edit own entries & screen runtime logs; no access to MRF, Doc Bank, or project notes)
- **Projects Managed**:
  1. Bio-Mining Phase I (Zigma, Ramapuram) — *Completed*
  2. Bio-Mining Phase II (Zigma, Ramapuram) — *Completed*
  3. Bio-Mining Phase III (Zigma, Ramapuram) — *In progress*
  4. Bio-Mining Phase III (Card Box Company, Ramapuram) — *In progress* (features dual trommel Screen Runtime logging)
  5. MRF Plant (Raghuram Hume Pipes, Thukivakam) — *In progress*

## Key Architectural Decisions
- Data stored as incremental entries (one row per report/shift), compute totals dynamically.
- Mobile-first PWA design with retro terminal / paper aesthetic.
- **Private Dashboard**: Authentication required for all routes; unauthenticated requests redirect to `/login?next=...`. Supabase anon key reads removed; server cached reads use service-role reader (`lib/supabase/reader.ts`).
- **Access Control**: Role enforcement via `proxy.ts` (middleware), Server Actions (`lib/access.ts`), and Supabase RLS (`app_role()` and `app_agency()`).
- **Screen Runtime**: Card Box dual-screen logging (Red & Yellow trommels, Day & Night shifts, runtime & breakdown minutes with mandatory reasons when breakdown > 0).

## Key Files & Structure
- `docs/PRD — Project Status Dashboard (Bio-Mining & MRF, Tirupati).md`: Master PRD.
- `docs/superpowers/plans/2026-09-18-foundation.md`: Core implementation plan.
- `docs/superpowers/specs/2026-09-18-project-status-dashboard-design.md`: Dashboard spec.
- `docs/superpowers/specs/2026-10-02-cardbox-screen-runtime-and-roles-design.md`: Screen runtime & roles spec.
- `lib/access.ts`: Pure role access, route decisions, and ownership guards.
- `lib/runtime.ts`: Screen runtime validation, formatting, and summary calculations.
- `lib/supabase/reader.ts`: Server-only service-role client for cached reads.
