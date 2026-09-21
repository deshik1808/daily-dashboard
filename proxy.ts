import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const EDITOR_ONLY_PREFIXES = ["/entry", "/mrf/new", "/mrf/edit"];
// /phase/<id>/edit sits under an otherwise public prefix, so it needs its own match.
const EDITOR_ONLY_PATTERNS = [/^\/phase\/[^/]+\/edit\/?$/];

export async function proxy(request: NextRequest) {
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

  // `getClaims()` rather than `getUser()`. This proxy matches every non-static
  // request, so `getUser()` put a round trip to the Supabase Auth server in
  // front of *every* navigation for anyone with a session — i.e. the Editor,
  // on every single click, before the page even began rendering.
  //
  // `getClaims()` still calls `getSession()` internally, so an expired token is
  // refreshed and the refreshed cookies still flow through `setAll` above. The
  // difference is verification: this project signs with ES256, so the signature
  // is checked locally against the JWKS, which auth-js caches process-wide
  // (`GLOBAL_JWKS`, 10-minute TTL) rather than per client instance. If the JWKS
  // can't be used, auth-js falls back to `getUser()` on its own.
  // A verification failure (`error` set) is not the same as "signed out"
  // (`data` and `error` both null). Only the former falls back to the network
  // check — so a JWKS hiccup can cost a round trip but can never lock a
  // legitimately signed-in Editor out of their own edit pages.
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  let isSignedIn = typeof claims?.claims?.sub === "string";

  if (!isSignedIn && claimsError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isSignedIn = !!user;
  }

  const { pathname } = request.nextUrl;
  const isEditorOnlyPath =
    EDITOR_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) ||
    EDITOR_ONLY_PATTERNS.some((re) => re.test(pathname));

  if (isEditorOnlyPath && !isSignedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
