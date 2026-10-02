// app/p/[code]/route.ts
// Short-link redirect: /p/1z → /phase/<uuid> (Phase I · Zigma)
// Code format: <arabic phase number><agency first letter lowercase>

import { redirect } from "next/navigation";
import { readerSupabase } from "@/lib/supabase/reader";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const match = code.match(/^(\d+)([a-z])$/);
  if (!match) {
    redirect("/");
  }

  const ARABIC_TO_ROMAN: Record<string, "I" | "II" | "III"> = {
    "1": "I", "2": "II", "3": "III",
  };

  const roman = ARABIC_TO_ROMAN[match[1]];
  const agencyInitial = match[2].toUpperCase();

  if (!roman) {
    redirect("/");
  }

  const { data } = await readerSupabase
    .from("phase_master")
    .select("id")
    .eq("phase", roman)
    .ilike("agency", `${agencyInitial}%`)
    .maybeSingle();

  if (!data) {
    redirect("/");
  }

  redirect(`/phase/${data.id}`);
}
