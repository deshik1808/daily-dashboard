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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isEditorOnlyPath =
    EDITOR_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) ||
    EDITOR_ONLY_PATTERNS.some((re) => re.test(pathname));

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
