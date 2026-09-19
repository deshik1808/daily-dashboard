# MEMORY.md — Project Memory & Architecture Context

## Project Overview
**Project**: Project Status Dashboard (Bio-Mining & MRF, Tirupati)
**Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Auth + Database + Storage)

## Core Domain & Context
- **Editor**: Deshik (logs daily progress & shift data)
- **Viewer**: Superior (read-only view access)
- **Projects Managed**:
  1. Bio-Mining Phase I (Zigma, Ramapuram) — *Completed*
  2. Bio-Mining Phase II (Zigma, Ramapuram) — *Completed*
  3. Bio-Mining Phase III (Zigma, Ramapuram) — *In progress*
  4. Bio-Mining Phase III (Card Box Company, Ramapuram) — *In progress*
  5. MRF Plant (Raghuram Hume Pipes, Thukivakam) — *In progress*

## Key Architectural Decisions
- Data stored as incremental entries (one row per report/shift), compute totals dynamically.
- Mobile-first PWA design.
- Supabase RLS enforcing read-only for unauthenticated users, write access restricted to authenticated Editor.

## Key Files & Structure
- `docs/PRD — Project Status Dashboard (Bio-Mining & MRF, Tirupati).md`: Master PRD.
- `docs/superpowers/plans/2026-09-18-foundation.md`: Core implementation plan.
- `docs/superpowers/specs/2026-09-18-project-status-dashboard-design.md`: Dashboard spec.
