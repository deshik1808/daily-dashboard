// lib/supabase/public.ts
// Cookie-free Supabase client for cached, publicly-readable reads.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * A Supabase client that carries no session.
 *
 * `use cache` scopes are forbidden from calling `cookies()`, so the normal
 * request-bound client in `./server` can't be used inside one. Every table this
 * reads is readable by the anon role (the dashboard is viewable without signing
 * in), so a cached anon read returns exactly what a Viewer would see — the same
 * bytes for everyone, which is what makes it cacheable at all.
 *
 * Editor-only state never comes from here. Whether the Editor is signed in is
 * resolved per request by `lib/auth.ts`, and writes still go through the
 * cookie-bound client so RLS sees the real user.
 *
 * Created once at module scope: it holds no per-request state, and sharing it
 * lets the underlying fetch connection pool stay warm between requests.
 */
export const publicSupabase = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function createPublicClient() {
  return publicSupabase;
}

