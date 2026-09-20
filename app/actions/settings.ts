// app/actions/settings.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const DEFAULT_PHONE = process.env.REPLY_WHATSAPP_NUMBER || "910000000000";

/**
 * Retrieves the currently configured WhatsApp reply phone number.
 * First checks dynamic `app_settings` in Supabase; falls back to env or default.
 */
export async function getReplyWhatsAppNumber(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "reply_whatsapp_number")
      .maybeSingle();

    if (data?.value && data.value.trim()) {
      return data.value.trim();
    }
  } catch (err) {
    console.warn("Failed to fetch reply_whatsapp_number setting, using fallback:", err);
  }

  return DEFAULT_PHONE;
}

/**
 * Updates the WhatsApp reply phone number in `app_settings`.
 * Restricted to authenticated Editor users.
 */
export async function updateReplyWhatsAppNumber(rawNumber: string): Promise<{
  success: boolean;
  number?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in as an Editor to change settings." };
  }

  // Clean the number: strip +, spaces, dashes, parentheses
  const cleaned = rawNumber.replace(/[\s+\-()]/g, "");

  // Validate: must be 10-15 digits (E.164 without +)
  if (!/^\d{10,15}$/.test(cleaned)) {
    return {
      success: false,
      error: "Please enter a valid phone number with country code (10–15 digits, e.g. 919876543210).",
    };
  }

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "reply_whatsapp_number",
      value: cleaned,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("Failed to update reply_whatsapp_number:", error);
    return { success: false, error: error.message || "Failed to save phone number." };
  }

  revalidatePath("/", "layout");
  return { success: true, number: cleaned };
}
