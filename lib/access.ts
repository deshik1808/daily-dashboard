// lib/access.ts
// Pure access control logic for roles, routes, and record permissions.
// Kept free of Next/Supabase imports so it can be unit-tested directly.

export type AppRole = "editor" | "viewer" | "operator";

export interface SessionUser {
  userId: string;
  role: AppRole | null;
  agency: string | null;
}

export type AccessDecision =
  | { allow: true }
  | { allow: false; redirect: string };

/**
 * Parses the role and agency claims out of Supabase user app_metadata.
 * An unknown role, or an operator without an agency, is treated as no role.
 */
export function parseRole(appMetadata?: Record<string, unknown> | null): {
  role: AppRole | null;
  agency: string | null;
} {
  if (!appMetadata) return { role: null, agency: null };
  const rawRole = appMetadata.app_role;
  const rawAgency = appMetadata.agency;
  const agency =
    typeof rawAgency === "string" && rawAgency.trim() ? rawAgency.trim() : null;

  if (rawRole === "editor") return { role: "editor", agency: null };
  if (rawRole === "viewer") return { role: "viewer", agency: null };
  if (rawRole === "operator") {
    if (!agency) return { role: null, agency: null };
    return { role: "operator", agency };
  }
  return { role: null, agency: null };
}

/**
 * Decides whether a given path and search query is accessible for the session.
 * Checked in order:
 * 1. /api/*: allow. Route handlers check session themselves.
 * 2. /login: allow.
 * 3. No session: redirect to /login?next=<path + search>.
 * 4. Session without a role: redirect to /login.
 * 5. Editor: allow.
 * 6. Viewer: editor-only paths redirect to /; everything else allowed.
 * 7. Operator: allow /, /phase/<id>, /phase/<id>/runtime, /entry/*, /runtime/*; everything else redirects to /.
 */
export function decideAccess(
  pathname: string,
  search: string,
  session: SessionUser | null
): AccessDecision {
  // 1. /api/*: allow.
  if (pathname.startsWith("/api/")) {
    return { allow: true };
  }

  // 2. /login: allow.
  if (pathname === "/login") {
    return { allow: true };
  }

  // 3. No session: redirect to /login?next=<path + search>.
  if (!session) {
    const fullPath = search ? `${pathname}${search}` : pathname;
    const nextParam = encodeURIComponent(fullPath);
    return { allow: false, redirect: `/login?next=${nextParam}` };
  }

  // 4. Session without a role: redirect to /login.
  if (!session.role) {
    return { allow: false, redirect: "/login" };
  }

  // 5. Editor: allow.
  if (session.role === "editor") {
    return { allow: true };
  }

  const cleanPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  // 6. Viewer: editor-only paths redirect to /; everything else allowed.
  if (session.role === "viewer") {
    const isEditorOnly =
      cleanPath === "/entry" ||
      cleanPath.startsWith("/entry/") ||
      cleanPath === "/runtime" ||
      cleanPath.startsWith("/runtime/") ||
      cleanPath === "/mrf/new" ||
      cleanPath.startsWith("/mrf/edit/") ||
      /^\/phase\/[^/]+\/edit$/.test(cleanPath);

    if (isEditorOnly) {
      return { allow: false, redirect: "/" };
    }
    return { allow: true };
  }

  // 7. Operator: allow /, /phase/<id>, /phase/<id>/runtime, /entry/*, /runtime/*; everything else redirects to /.
  if (session.role === "operator") {
    const isAllowed =
      cleanPath === "/" ||
      /^\/phase\/[^/]+$/.test(cleanPath) ||
      /^\/phase\/[^/]+\/runtime$/.test(cleanPath) ||
      cleanPath === "/entry" ||
      cleanPath.startsWith("/entry/") ||
      cleanPath === "/runtime" ||
      cleanPath.startsWith("/runtime/");

    if (isAllowed) {
      return { allow: true };
    }
    return { allow: false, redirect: "/" };
  }

  return { allow: false, redirect: "/login" };
}

/**
 * Editor can always write; Operator only for their assigned agency.
 */
export function canWriteAgency(
  session: { role: AppRole | null; agency: string | null } | null | undefined,
  agency: string
): boolean {
  if (!session || !session.role) return false;
  if (session.role === "editor") return true;
  if (session.role === "operator") {
    return session.agency === agency;
  }
  return false;
}

/**
 * Editor can edit any record; Operator only records they created in their agency.
 */
export function canEditRecord(
  session:
    | { userId: string; role: AppRole | null; agency: string | null }
    | null
    | undefined,
  record: { agency: string; created_by?: string | null }
): boolean {
  if (!session || !session.role) return false;
  if (session.role === "editor") return true;
  if (session.role === "operator") {
    return (
      session.agency === record.agency &&
      Boolean(session.userId && record.created_by && session.userId === record.created_by)
    );
  }
  return false;
}
