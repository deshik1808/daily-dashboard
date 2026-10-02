import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess, parseRole, type SessionUser } from "@/lib/access";

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

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  let session: SessionUser | null = null;

  if (claims && typeof claims.claims?.sub === "string" && claims.claims.sub.length > 0) {
    const { role, agency } = parseRole(
      claims.claims.app_metadata as Record<string, unknown> | undefined
    );
    session = {
      userId: claims.claims.sub,
      role,
      agency,
    };
  } else if (claimsError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { role, agency } = parseRole(user.app_metadata);
      session = {
        userId: user.id,
        role,
        agency,
      };
    }
  }

  const { pathname, search } = request.nextUrl;
  const decision = decideAccess(pathname, search, session);

  if (!decision.allow) {
    const url = request.nextUrl.clone();
    const [redirectPath, redirectSearch] = decision.redirect.split("?");
    url.pathname = redirectPath;
    url.search = redirectSearch ? `?${redirectSearch}` : "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
