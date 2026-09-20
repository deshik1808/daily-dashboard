// app/actions/mrf-logs.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateMrfLog } from "@/lib/mrf";
import { getOrCreateShortLink } from "@/lib/short-links";

export interface MrfFormState {
  errors?: Record<string, string>;
  error?: string;
}

const UNIQUE_VIOLATION = "23505";
const DUPLICATE_MESSAGE = "A log already exists for that date. Edit the existing log instead.";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function readMrfForm(formData: FormData): Record<string, unknown> {
  return {
    log_date: formData.get("log_date"),
    note: formData.get("note"),
    // The uploader posts one hidden input per already-uploaded object key.
    photo_paths: formData.getAll("photo_paths"),
  };
}

/**
 * Mints and caches the short link for a log's date page.
 *
 * Runs via `after` so the is.gd round-trip never delays the Editor's save, and
 * so a shortener outage can never fail it: `getOrCreateShortLink` returns null
 * on timeout or a bad response, and the Reply button falls back to /m/YYMMDD.
 * Only the Editor reaches this path, which is what the short_links insert
 * policy requires.
 */
function scheduleShortLink(logDate: string) {
  after(async () => {
    try {
      const supabase = await createClient();
      await getOrCreateShortLink(supabase, `/mrf/${logDate}`);
    } catch (err) {
      console.warn(`short link minting failed for ${logDate}:`, err);
    }
  });
}

async function requireEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createMrfLog(
  _prevState: MrfFormState,
  formData: FormData
): Promise<MrfFormState> {
  const { supabase, user } = await requireEditor();
  if (!user) return { error: "Unauthorized: editor login required" };

  const validation = validateMrfLog(readMrfForm(formData), utcToday());
  if (!validation.valid || !validation.value) return { errors: validation.errors };

  const { error } = await supabase
    .from("mrf_logs")
    .insert({ created_by: user.id, ...validation.value });

  if (error) {
    console.error("createMrfLog failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    return { error: error.message || "Could not save the log. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/mrf");
  revalidatePath(`/mrf/${validation.value.log_date}`);
  scheduleShortLink(validation.value.log_date);
  redirect(`/mrf/${validation.value.log_date}`);
}

export async function updateMrfLog(
  logId: string,
  _prevState: MrfFormState,
  formData: FormData
): Promise<MrfFormState> {
  const { supabase, user } = await requireEditor();
  if (!user) return { error: "Unauthorized: editor login required" };

  const validation = validateMrfLog(readMrfForm(formData), utcToday());
  if (!validation.valid || !validation.value) return { errors: validation.errors };

  const { error } = await supabase
    .from("mrf_logs")
    .update(validation.value)
    .eq("id", logId)
    .is("deleted_at", null);

  if (error) {
    console.error("updateMrfLog failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    return { error: error.message || "Could not save the log. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/mrf");
  revalidatePath(`/mrf/${validation.value.log_date}`);
  scheduleShortLink(validation.value.log_date);
  redirect(`/mrf/${validation.value.log_date}`);
}

export async function deleteMrfLog(logId: string): Promise<MrfFormState> {
  const { supabase, user } = await requireEditor();
  if (!user) return { error: "Unauthorized: editor login required" };

  const { error } = await supabase
    .from("mrf_logs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", logId)
    .is("deleted_at", null);

  if (error) {
    console.error("deleteMrfLog failed:", error);
    return { error: error.message || "Could not delete the log. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/mrf");
  redirect("/mrf");
}
