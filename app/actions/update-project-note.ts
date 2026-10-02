// app/actions/update-project-note.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { validateAndNormalizeNote } from "@/lib/notes";
import { parseRole } from "@/lib/access";

export interface UpdateNoteResult {
  success: boolean;
  note?: string;
  error?: string;
}

export async function updateProjectNote(
  phaseAgencyId: string,
  rawNote: string
): Promise<UpdateNoteResult> {
  const validation = validateAndNormalizeNote(rawNote);
  if (!validation.valid || validation.value === undefined) {
    return {
      success: false,
      error: validation.error ?? "Note cannot be empty",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You're signed out. Sign in again to save.",
    };
  }

  const { role } = parseRole(user.app_metadata);
  if (role !== "editor") {
    return {
      success: false,
      error: "Unauthorized: Editor role required to update notes",
    };
  }

  const { error } = await supabase
    .from("phase_master")
    .update({
      current_note: validation.value,
      note_updated_at: new Date().toISOString(),
    })
    .eq("id", phaseAgencyId);

  if (error) {
    console.error("Failed to update project note in phase_master:", error);
    return {
      success: false,
      error: error.message || "Failed to save note. Please try again.",
    };
  }

  return {
    success: true,
    note: validation.value,
  };
}
