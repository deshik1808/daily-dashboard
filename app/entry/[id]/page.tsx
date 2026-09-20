// app/entry/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";
import { EntryForm } from "@/components/design/EntryForm";
import { DeleteConfirm } from "@/components/design/DeleteConfirm";
import { deleteEntry } from "@/app/actions/bio-mining-entries";

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entry, error } = await supabase
    .from("bio_mining_entries")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) console.error("bio_mining_entries lookup failed", error);
  if (!entry) notFound();

  const { data: phase } = await supabase
    .from("phase_master")
    .select("phase")
    .eq("id", entry.phase_agency_id)
    .maybeSingle();

  const boundDelete = deleteEntry.bind(null, id, entry.phase_agency_id);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`EDIT ENTRY${phase ? ` · PHASE ${phase.phase}` : ""}`}
        backHref={`/phase/${entry.phase_agency_id}`}
      />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <EntryForm
          phaseAgencyId={entry.phase_agency_id}
          entryId={id}
          initial={{
            report_date: entry.report_date,
            shift: entry.shift,
            inward_mt: entry.inward_mt,
            remarks: entry.remarks,
            soil_mt: entry.soil_mt,
            rdf_mt: entry.rdf_mt,
            stones_mt: entry.stones_mt,
            inert_mt: entry.inert_mt,
            steel_mt: entry.steel_mt,
            tyre_mt: entry.tyre_mt,
            wood_mt: entry.wood_mt,
            glass_mt: entry.glass_mt,
            iron_scrap_mt: entry.iron_scrap_mt,
            wires_cables_mt: entry.wires_cables_mt,
            others_mt: entry.others_mt,
          }}
        />

        <Window title="DANGER ZONE">
          <DeleteConfirm
            action={boundDelete}
            label="DELETE THIS ENTRY"
            confirmText="This removes the entry from all totals and reports. It stays recoverable in the database. Continue?"
          />
        </Window>
      </div>
    </div>
  );
}
