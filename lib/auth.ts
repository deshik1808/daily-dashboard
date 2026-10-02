// lib/auth.ts
// Request-bound session and role lookup.
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseRole, type SessionUser } from "@/lib/access";

/**
 * Returns the current request's session user with parsed role and agency, or null.
 *
 * Uses `getClaims()` instead of `getUser()`. This project signs JWTs with ES256
 * asymmetric keys, so `getClaims()` verifies the signature locally against JWKS
 * that auth-js caches process-wide — no network round trip needed for authenticated visits.
 * If verification fails (e.g. key rotation), it falls back to `getUser()`.
 *
 * Memoized per request with `cache()` so nested server components can share it.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (data && typeof data.claims?.sub === "string" && data.claims.sub.length > 0) {
      const { role, agency } = parseRole(
        data.claims.app_metadata as Record<string, unknown> | undefined
      );
      return {
        userId: data.claims.sub,
        role,
        agency,
      };
    }

    if (error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { role, agency } = parseRole(user.app_metadata);
        return {
          userId: user.id,
          role,
          agency,
        };
      }
    }

    return null;
  } catch (err) {
    unstable_rethrow(err);
    console.warn("Session check failed:", err);
    return null;
  }
});

/**
 * True when the request carries an Editor session.
 */
export const isEditor = cache(async (): Promise<boolean> => {
  const session = await getSession();
  return session?.role === "editor";
});
