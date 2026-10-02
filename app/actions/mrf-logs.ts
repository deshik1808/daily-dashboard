// app/actions/mrf-logs.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { TAGS } from "@/lib/data";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateMrfLog } from "@/lib/mrf";
import { getOrCreateShortLink } from "@/lib/short-links";
import { sendPushNotification } from "@/lib/push";
import { parseRole } from "@/lib/access";

export interface MrfFormState {
  errors?: Record<string, string>;
  error?: string;
}

const UNIQUE_VIOLATION = "23505";
const DUPLICATE_MESSAGE = "A log already exists for that date. Edit the existing log instead.";
const PERMISSION_MESSAGE = "You don't have permission to change this record.";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function readMrfForm(formData: FormData): Record<string, unknown> {
  return {
    log_date: formData.get("log_date"),
    note: formData.get("note"),
    photo_paths: formData.getAll("photo_paths"),
  };
}

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

  if (!user) return { supabase, user: null, error: "You're signed out. Sign in again to save." };

  const { role } = parseRole(user.app_metadata);
  if (role !== "editor") return { supabase, user: null, error: PERMISSION_MESSAGE };

  return { supabase, user, error: null };
}

export async function createMrfLog(
  _prevState: MrfFormState,
  formData: FormData
): Promise<MrfFormState> {
  const { supabase, user, error: authError } = await requireEditor();
  if (!user) return { error: authError ?? PERMISSION_MESSAGE };

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
  updateTag(TAGS.mrfLogs);
  scheduleShortLink(validation.value.log_date);

  const logDate = validation.value.log_date;
  after(async () => {
    await sendPushNotification({
      title: "New MRF Log",
      body: `MRF log added for ${logDate}.`,
      url: `/mrf/${logDate}`,
    });
  });

  redirect(`/mrf/${validation.value.log_date}`);
}

export async function updateMrfLog(
  logId: string,
  _prevState: MrfFormState,
  formData: FormData
): Promise<MrfFormState> {
  const { supabase, user, error: authError } = await requireEditor();
  if (!user) return { error: authError ?? PERMISSION_MESSAGE };

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
  updateTag(TAGS.mrfLogs);
  scheduleShortLink(validation.value.log_date);
  redirect(`/mrf/${validation.value.log_date}`);
}

export async function deleteMrfLog(logId: string): Promise<MrfFormState> {
  const { supabase, user, error: authError } = await requireEditor();
  if (!user) return { error: authError ?? PERMISSION_MESSAGE };

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
  updateTag(TAGS.mrfLogs);
  redirect("/mrf");
}
