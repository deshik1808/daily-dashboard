// app/actions/phase-master.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { TAGS } from "@/lib/data";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validatePhase } from "@/lib/phase";
import { parseRole } from "@/lib/access";

export interface PhaseFormState {
  errors?: Record<string, string>;
  error?: string;
}

/** Postgres unique_violation — the unique (phase, agency) pair on phase_master. */
const UNIQUE_VIOLATION = "23505";
const DUPLICATE_MESSAGE =
  "Another project already uses that phase and agency combination. Pick a different pair.";
const PERMISSION_MESSAGE = "You don't have permission to change this record.";

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

export async function updatePhase(
  phaseAgencyId: string,
  _prevState: PhaseFormState,
  formData: FormData
): Promise<PhaseFormState> {
  const { supabase, user, error: authError } = await requireEditor();
  if (!user) return { error: authError ?? PERMISSION_MESSAGE };

  const validation = validatePhase({
    phase: formData.get("phase"),
    agency: formData.get("agency"),
    order_qty_mt: formData.get("order_qty_mt"),
    status: formData.get("status"),
    current_note: formData.get("current_note"),
  });
  if (!validation.valid || !validation.value) return { errors: validation.errors };

  const { current_note, ...rest } = validation.value;

  const { error } = await supabase
    .from("phase_master")
    .update({
      ...rest,
      current_note,
      note_updated_at: new Date().toISOString(),
    })
    .eq("id", phaseAgencyId);

  if (error) {
    console.error("updatePhase failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    return { error: error.message || "Could not save the phase. Please try again." };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  updateTag(TAGS.phases);
  redirect(`/phase/${phaseAgencyId}`);
}
