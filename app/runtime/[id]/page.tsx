// app/runtime/[id]/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canEditRecord } from "@/lib/access";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";
import { RuntimeForm } from "@/components/design/RuntimeForm";
import { DeleteConfirm } from "@/components/design/DeleteConfirm";
import { deleteRuntimeLog } from "@/app/actions/screen-runtime";

export default async function EditRuntimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: log, error } = await supabase
    .from("screen_runtime_logs")
    .select("*, phase_master(agency, phase)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) console.error("screen_runtime_logs lookup failed", error);
  if (!log) {
    redirect("/");
  }

  const phaseInfo = log.phase_master as { agency: string; phase: string } | null;
  const phaseAgency = phaseInfo?.agency ?? "";

  // Check permissions:
  // If operator visits another agency's record -> redirect to /
  if (session.role === "operator" && session.agency !== phaseAgency) {
    redirect("/");
  }

  // If operator visits row he didn't create -> redirect to that row's phase page
  if (!canEditRecord(session, { agency: phaseAgency, created_by: log.created_by })) {
    redirect(`/phase/${log.phase_agency_id}`);
  }

  const boundDelete = deleteRuntimeLog.bind(null, id, log.phase_agency_id);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`EDIT RUNTIME · ${phaseAgency.toUpperCase()}`}
        backHref={`/phase/${log.phase_agency_id}`}
      />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <RuntimeForm
          phaseAgencyId={log.phase_agency_id}
          logId={id}
          initial={{
            log_date: log.log_date,
            shift: log.shift as "Day" | "Night",
            red_runtime_min: log.red_runtime_min,
            red_breakdown_min: log.red_breakdown_min,
            red_breakdown_reasons: log.red_breakdown_reasons,
            yellow_runtime_min: log.yellow_runtime_min,
            yellow_breakdown_min: log.yellow_breakdown_min,
            yellow_breakdown_reasons: log.yellow_breakdown_reasons,
          }}
        />

        <Window title="DANGER ZONE">
          <DeleteConfirm
            action={boundDelete}
            label="DELETE THIS SHIFT"
            confirmText="This removes the shift from the runtime log. It stays recoverable in the database."
          />
        </Window>
      </div>
    </div>
  );
}
