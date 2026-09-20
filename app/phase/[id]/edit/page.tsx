// app/phase/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { PhaseEditForm } from "@/components/design/PhaseEditForm";

export default async function EditPhasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: phase, error } = await supabase
    .from("phase_master")
    .select("id, phase, agency, order_qty_mt, status, current_note")
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("phase_master lookup failed", error);
  if (!phase) notFound();

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`EDIT PHASE ${phase.phase} · ${phase.agency.toUpperCase()}`}
        backHref={`/phase/${id}`}
      />
      <div className="flex-1 overflow-y-auto bg-canvas p-3">
        <PhaseEditForm
          phaseAgencyId={id}
          initial={{
            phase: phase.phase,
            agency: phase.agency,
            order_qty_mt: phase.order_qty_mt,
            status: phase.status,
            current_note: phase.current_note ?? "",
          }}
        />
      </div>
    </div>
  );
}
