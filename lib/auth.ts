// lib/auth.ts
// Whether the current request carries a valid Editor session.
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * True when the request carries a valid, unexpired Editor session.
 *
 * Uses `getClaims()` instead of `getUser()`. `getUser()` calls the Supabase
 * Auth server to validate the token, which cost every page an extra network
 * round trip *before* it could even start its own queries. This project signs
 * JWTs with ES256 asymmetric keys (see `/auth/v1/.well-known/jwks.json`), so
 * `getClaims()` verifies the signature locally against JWKS that auth-js caches
 * process-wide — same security property, no round trip.
 *
 * Returns a boolean because that is all any caller needs: every page uses this
 * purely to decide whether to show Editor affordances. Authorization itself is
 * enforced by RLS on the database, not by this check.
 *
 * Memoized per request with `cache()` so a page and its nested components can
 * each ask without re-verifying.
 */
export const isEditor = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (data && typeof data.claims?.sub === "string" && data.claims.sub.length > 0) {
      return true;
    }

    // `error` set means verification failed, not that the visitor is signed
    // out (that case returns both `data` and `error` as null). Fall back to the
    // network check so a JWKS problem degrades to the old cost rather than
    // silently hiding the Editor's own controls from them.
    if (error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return !!user;
    }

    return false;
  } catch (err) {
    // Under Cache Components, `cookies()` rejects once a prerender completes —
    // that rejection is how React marks this subtree as a request-time hole.
    // Catching it would bake "signed out" into the static shell, so hand every
    // framework-internal error (this, `notFound()`, `redirect()`) straight back.
    unstable_rethrow(err);

    // A genuinely malformed token means "not an Editor", never a crash.
    console.warn("Editor session check failed:", err);
    return false;
  }
});
