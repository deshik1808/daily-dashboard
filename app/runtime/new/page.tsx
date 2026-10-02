// app/runtime/new/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canWriteAgency } from "@/lib/access";
import { TopBar } from "@/components/design/TopBar";
import { RuntimeForm } from "@/components/design/RuntimeForm";

export default async function NewRuntimePage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const { phase: phaseAgencyId } = await searchParams;
  if (!phaseAgencyId) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: phase, error } = await supabase
    .from("phase_master")
    .select("id, phase, agency")
    .eq("id", phaseAgencyId)
    .maybeSingle();

  if (error) console.error("phase_master lookup failed", error);
  if (!phase) notFound();

  if (!canWriteAgency(session, phase.agency)) {
    redirect("/");
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`LOG RUNTIME · ${phase.agency.toUpperCase()}`}
        backHref={`/phase/${phaseAgencyId}`}
      />
      <div className="flex-1 overflow-y-auto bg-canvas p-3">
        <RuntimeForm phaseAgencyId={phaseAgencyId} />
      </div>
    </div>
  );
}
