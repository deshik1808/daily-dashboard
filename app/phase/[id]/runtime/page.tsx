// app/phase/[id]/runtime/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPhaseById, getRuntimeLogs } from "@/lib/data";
import { canWriteAgency, canEditRecord } from "@/lib/access";
import { summarizeRuntime } from "@/lib/runtime";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { RuntimeSummaryTable } from "@/components/design/RuntimeSummary";
import { getMeterReadings } from "@/lib/meter-readings";
import { RuntimeRow } from "@/components/design/RuntimeRow";
import { ReplyButton } from "@/components/design/ReplyButton";

export default async function FullRuntimePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  const isAllTime = range === "all";

  let since: string | null = null;
  if (!isAllTime) {
    // eslint-disable-next-line react-hooks/purity
    since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  const [session, phase, logs] = await Promise.all([
    getSession(),
    getPhaseById(id),
    getRuntimeLogs(id, since),
  ]);

  if (!phase) notFound();

  // If operator visits another agency's runtime page, redirect to home
  if (session?.role === "operator" && session.agency !== phase.agency) {
    redirect("/");
  }

  const canAdd = canWriteAgency(session, phase.agency ?? "");
  const summary = summarizeRuntime(logs ?? []);
  const meterByLog = await getMeterReadings(
    session?.role,
    (logs ?? []).flatMap((l) => (l.id ? [l.id] : []))
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`SCREEN RUNTIME · ${phase.agency?.toUpperCase()}`}
        backHref={`/phase/${id}`}
      />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3 animate-fade-in font-mono">
        {summary && (
          <Window title="SCREEN RUNTIME">
            <RuntimeSummaryTable
              summary={summary}
              rangeLabel={isAllTime ? "ALL TIME" : "LAST 30 DAYS"}
            />
          </Window>
        )}

        <Window title="RUNTIME LOG">
          {canAdd && (
            <Link
              href={`/runtime/new?phase=${id}`}
              className="mb-2.5 block rounded-control border border-ink bg-ink py-2 text-center text-xs font-bold tracking-wide text-paper"
            >
              + ADD SHIFT RUNTIME
            </Link>
          )}

          <div className="mb-2.5 flex gap-1.5">
            <Link
              href={`/phase/${id}/runtime`}
              className={`rounded-control border border-ink px-2 py-1 text-[10px] ${
                !isAllTime ? "bg-ink text-paper" : ""
              }`}
            >
              LAST 30D
            </Link>
            <Link
              href={`/phase/${id}/runtime?range=all`}
              className={`rounded-control border border-ink px-2 py-1 text-[10px] ${
                isAllTime ? "bg-ink text-paper" : ""
              }`}
            >
              ALL TIME
            </Link>
          </div>

          {(logs ?? []).length === 0 ? (
            <p className="py-2 text-xs text-muted">No runtime logged yet.</p>
          ) : (
            (logs ?? []).map((log) => (
              <RuntimeRow
                key={log.id}
                log={log}
                meter={log.id ? meterByLog[log.id] : undefined}
                canEdit={canEditRecord(session, {
                  agency: phase.agency ?? "",
                  created_by: log.created_by,
                })}
              />
            ))
          )}
        </Window>
      </div>

      <BottomNav active="home" isOperator={session?.role === "operator"}>
        <ReplyButton
          context={{
            label: `Screen Runtime · ${phase.agency}`,
            path: `/phase/${id}/runtime`,
          }}
          role={session?.role}
        />
      </BottomNav>
    </div>
  );
}
