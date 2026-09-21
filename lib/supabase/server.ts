import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "./database.types";

/**
 * Per-request Supabase server client.
 *
 * Memoized with React `cache()`: a single page render used to build three
 * separate clients (the page itself, `getReplyWhatsAppNumber()`, and the reply
 * pill's link lookup), each re-reading cookies and re-creating the client.
 * `cache()` collapses those into one instance per request, so nested server
 * components can call this freely without paying for it.
 */
export const createClient = cache(async () => {
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
            // Called from a Server Component render; proxy (Task 7) refreshes the session instead.
          }
        },
      },
    }
  );
});
