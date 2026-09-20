// app/actions/bio-mining-entries.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateEntry, MATERIAL_FIELDS } from "@/lib/entries";

export interface EntryFormState {
  errors?: Record<string, string>;
  error?: string;
}

/** Postgres unique_violation — the (phase, date, shift) partial unique index. */
const UNIQUE_VIOLATION = "23505";
const DUPLICATE_MESSAGE =
  "An entry already exists for this phase on that date and shift. Edit the existing entry instead.";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function readEntryForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    report_date: formData.get("report_date"),
    shift: formData.get("shift"),
    inward_mt: formData.get("inward_mt"),
    remarks: formData.get("remarks"),
  };
  for (const field of MATERIAL_FIELDS) {
    raw[field.key] = formData.get(field.key);
  }
  return raw;
}

async function requireEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createEntry(
  phaseAgencyId: string,
  _prevState: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  const { supabase, user } = await requireEditor();
  if (!user) return { error: "Unauthorized: editor login required" };

  const validation = validateEntry(readEntryForm(formData), utcToday());
  if (!validation.valid || !validation.value) {
    return { errors: validation.errors };
  }

  const { error } = await supabase.from("bio_mining_entries").insert({
    phase_agency_id: phaseAgencyId,
    created_by: user.id,
    ...validation.value,
  });

  if (error) {
    console.error("createEntry failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    return { error: error.message || "Could not save the entry. Please try again." };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  redirect(`/phase/${phaseAgencyId}`);
}

export async function updateEntry(
  entryId: string,
  phaseAgencyId: string,
  _prevState: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  const { supabase, user } = await requireEditor();
  if (!user) return { error: "Unauthorized: editor login required" };

  const validation = validateEntry(readEntryForm(formData), utcToday());
  if (!validation.valid || !validation.value) {
    return { errors: validation.errors };
  }

  const { error } = await supabase
    .from("bio_mining_entries")
    .update(validation.value)
    .eq("id", entryId)
    .is("deleted_at", null);

  if (error) {
    console.error("updateEntry failed:", error);
    if (error.code === UNIQUE_VIOLATION) return { error: DUPLICATE_MESSAGE };
    return { error: error.message || "Could not save the entry. Please try again." };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  redirect(`/phase/${phaseAgencyId}`);
}

/**
 * Soft delete: sets deleted_at so the row drops out of every read query and the
 * phase_totals / phase_material_breakdown views, while staying recoverable.
 */
export async function deleteEntry(entryId: string, phaseAgencyId: string): Promise<EntryFormState> {
  const { supabase, user } = await requireEditor();
  if (!user) return { error: "Unauthorized: editor login required" };

  const { error } = await supabase
    .from("bio_mining_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", entryId)
    .is("deleted_at", null);

  if (error) {
    console.error("deleteEntry failed:", error);
    return { error: error.message || "Could not delete the entry. Please try again." };
  }

  revalidatePath("/");
  revalidatePath(`/phase/${phaseAgencyId}`);
  redirect(`/phase/${phaseAgencyId}`);
}
