// app/actions/screen-runtime.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { TAGS } from "@/lib/data";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRuntimeLog } from "@/lib/runtime";
import { parseRole, canWriteAgency, canEditRecord } from "@/lib/access";
import { sendPushNotification } from "@/lib/push";

export interface RuntimeFormState {
  errors?: Record<string, string>;
  error?: string;
}

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const INSUFFICIENT_PRIVILEGE = "42501";
const DUPLICATE_MESSAGE = "Already logged for this date and shift. Edit it instead.";
const PERMISSION_MESSAGE = "You don't have permission to change this record.";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatNotificationDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function readRuntimeForm(formData: FormData): Record<string, unknown> {
  return {
    log_date: formData.get("log_date"),
    shift: formData.get("shift"),
    red_runtime_h: formData.get("red_runtime_h"),
    red_runtime_m: formData.get("red_runtime_m"),
    red_breakdown_h: formData.get("red_breakdown_h"),
    red_breakdown_m: formData.get("red_breakdown_m"),
    red_breakdown_reasons: formData.get("red_breakdown_reasons"),
    yellow_runtime_h: formData.get("yellow_runtime_h"),
    yellow_runtime_m: formData.get("yellow_runtime_m"),
    yellow_breakdown_h: formData.get("yellow_breakdown_h"),
    yellow_breakdown_m: formData.get("yellow_breakdown_m"),
    yellow_breakdown_reasons: formData.get("yellow_breakdown_reasons"),
  };
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, session: null };

  const parsed = parseRole(user.app_metadata);
  const session = {
    userId: user.id,
    role: parsed.role,
    agency: parsed.agency,
  };

  return { supabase, user, session };
}

export async function createRuntimeLog(
  phaseAgencyId: string,
  _prevState: RuntimeFormState,
  formData: FormData
): Promise<RuntimeFormState> {
  const { supabase, user, session } = await getAuthContext();
  if (!user || !session) {
    return { error: "You're signed out. Sign in again to save." };
  }

  // Fetch phase agency to verify permission
  const { data: phase } = await supabase
    .from("phase_master")
    .select("agency")
    .eq("id", phaseAgencyId)
    .maybeSingle();

  if (!phase || !canWriteAgency(session, phase.agency)) {
    return { error: PERMISSION_MESSAGE };
  }

  const validation = validateRuntimeLog(readRuntimeForm(formData), utcToday());
  if (!validation.valid || !validation.value) {
    return { errors: validation.errors };
  }

  const { error } = await supabase.from("screen_runtime_logs").insert({
    phase_agency_id: phaseAgencyId,
    created_by: user.id,
    ...validation.value,
  });

  if (error) {
    console.error("createRuntimeLog failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    if (error.code === INSUFFICIENT_PRIVILEGE) return { error: PERMISSION_MESSAGE };
    if (error.code === CHECK_VIOLATION) {
      return { error: "Could not save. Please check the values and try again." };
    }
    return { error: "Could not save. Please try again." };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  revalidatePath(`/phase/${phaseAgencyId}/runtime`);
  updateTag(TAGS.runtime);

  const logDate = validation.value.log_date;
  const shift = validation.value.shift;

  after(async () => {
    await sendPushNotification({
      title: "Screen Runtime",
      body: `Card Box screen runtime logged · ${formatNotificationDate(logDate)}, ${shift} shift`,
      url: `/phase/${phaseAgencyId}`,
    });
  });

  redirect(`/phase/${phaseAgencyId}`);
}

export async function updateRuntimeLog(
  logId: string,
  phaseAgencyId: string,
  _prevState: RuntimeFormState,
  formData: FormData
): Promise<RuntimeFormState> {
  const { supabase, user, session } = await getAuthContext();
  if (!user || !session) {
    return { error: "You're signed out. Sign in again to save." };
  }

  // Fetch record and phase agency to check permission
  const { data: existing } = await supabase
    .from("screen_runtime_logs")
    .select("created_by, phase_master(agency)")
    .eq("id", logId)
    .is("deleted_at", null)
    .maybeSingle();

  const phaseAgency = (existing?.phase_master as { agency: string } | null)?.agency ?? "";

  if (!existing || !canEditRecord(session, { agency: phaseAgency, created_by: existing.created_by })) {
    return { error: PERMISSION_MESSAGE };
  }

  const validation = validateRuntimeLog(readRuntimeForm(formData), utcToday());
  if (!validation.valid || !validation.value) {
    return { errors: validation.errors };
  }

  const { data, error } = await supabase
    .from("screen_runtime_logs")
    .update(validation.value)
    .eq("id", logId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    console.error("updateRuntimeLog failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    if (error.code === INSUFFICIENT_PRIVILEGE) return { error: PERMISSION_MESSAGE };
    if (error.code === CHECK_VIOLATION) {
      return { error: "Could not save. Please check the values and try again." };
    }
    return { error: "Could not save. Please try again." };
  }

  if (!data || data.length === 0) {
    return { error: PERMISSION_MESSAGE };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  revalidatePath(`/phase/${phaseAgencyId}/runtime`);
  updateTag(TAGS.runtime);
  redirect(`/phase/${phaseAgencyId}`);
}

export async function deleteRuntimeLog(
  logId: string,
  phaseAgencyId: string
): Promise<RuntimeFormState> {
  const { supabase, user, session } = await getAuthContext();
  if (!user || !session) {
    return { error: "You're signed out. Sign in again to save." };
  }

  const { data: existing } = await supabase
    .from("screen_runtime_logs")
    .select("created_by, phase_master(agency)")
    .eq("id", logId)
    .is("deleted_at", null)
    .maybeSingle();

  const phaseAgency = (existing?.phase_master as { agency: string } | null)?.agency ?? "";

  if (!existing || !canEditRecord(session, { agency: phaseAgency, created_by: existing.created_by })) {
    return { error: PERMISSION_MESSAGE };
  }

  const { data, error } = await supabase
    .from("screen_runtime_logs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", logId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    console.error("deleteRuntimeLog failed:", error);
    if (error.code === INSUFFICIENT_PRIVILEGE) return { error: PERMISSION_MESSAGE };
    return { error: "Could not delete the record. Please try again." };
  }

  if (!data || data.length === 0) {
    return { error: PERMISSION_MESSAGE };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  revalidatePath(`/phase/${phaseAgencyId}/runtime`);
  updateTag(TAGS.runtime);
  redirect(`/phase/${phaseAgencyId}`);
}
