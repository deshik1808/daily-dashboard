# AGENTS.md — Rules & Guidance for AI Agents

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Context
- **Application**: Office Dashboard App (Bio-Mining & MRF, Tirupati)
- **Primary References**: Refer to [MEMORY.md](file:///c:/Users/deshi/Ofc%20dashboard%20app/MEMORY.md) for domain architecture and [docs/](file:///c:/Users/deshi/Ofc%20dashboard%20app/docs/) for specs & PRDs.

## Working Guidelines
1. **PWA & Mobile-First**: Maintain responsive mobile layouts.
2. **Data Integrity**: Store entries as incremental values; compute aggregates on demand.
3. **Type Safety**: Maintain strict TypeScript schemas matching Supabase database definitions.
