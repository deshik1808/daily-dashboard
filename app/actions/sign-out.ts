// app/actions/sign-out.ts
"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    // The auth cookies are cleared regardless, so continue to the public view.
    console.error("Sign out failed:", error);
  }

  // Auth lives in cookies, not the data cache, so refresh the router rather
  // than invalidating a path.
  refresh();
  redirect("/");
}
