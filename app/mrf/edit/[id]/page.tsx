// app/mrf/edit/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { Window } from "@/components/design/Window";
import { MrfLogForm } from "@/components/design/MrfLogForm";
import { DeleteConfirm } from "@/components/design/DeleteConfirm";
import { deleteMrfLog } from "@/app/actions/mrf-logs";

export default async function EditMrfLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: log, error } = await supabase
    .from("mrf_logs")
    .select("id, log_date, note, photo_paths")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) console.error("mrf_logs lookup failed", error);
  if (!log) notFound();

  const boundDelete = deleteMrfLog.bind(null, id);

  return (
    <div className="flex h-full flex-col">
      <TopBar title="EDIT MRF LOG" backHref={`/mrf/${log.log_date}`} />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <MrfLogForm logId={id} initial={{ log_date: log.log_date, note: log.note, photo_paths: log.photo_paths ?? [] }} />

        <Window title="DANGER ZONE">
          <DeleteConfirm
            action={boundDelete}
            label="DELETE THIS LOG"
            confirmText="This removes the log from the MRF list. It stays recoverable in the database. Continue?"
          />
        </Window>
      </div>
    </div>
  );
}
