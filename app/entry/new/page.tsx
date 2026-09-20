// app/entry/new/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { EntryForm } from "@/components/design/EntryForm";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const { phase: phaseAgencyId } = await searchParams;
  if (!phaseAgencyId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: phase, error } = await supabase
    .from("phase_master")
    .select("id, phase, agency")
    .eq("id", phaseAgencyId)
    .maybeSingle();

  if (error) console.error("phase_master lookup failed", error);
  if (!phase) notFound();

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`NEW ENTRY${phase ? ` · PHASE ${phase.phase}` : ""}`}
        backHref={`/phase/${phaseAgencyId}`}
      />
      <div className="flex-1 overflow-y-auto bg-canvas p-3">
        <EntryForm phaseAgencyId={phaseAgencyId} />
      </div>
    </div>
  );
}
