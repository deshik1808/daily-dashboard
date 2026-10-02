// lib/supabase/reader.ts
// Server-only service-role client for cached, read-only dashboard reads.
// Bypasses RLS so cached reads stay uniform and shareable across sessions.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

export const readerSupabase = createSupabaseClient<Database>(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function createReaderClient() {
  return readerSupabase;
}
