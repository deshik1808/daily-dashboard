// app/phase/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getPhaseById,
  getPhaseMaterials,
  getPhaseEntries,
  getRuntimeLogs,
} from "@/lib/data";
import { canWriteAgency, canEditRecord } from "@/lib/access";
import {
  SCREEN_RUNTIME_AGENCIES,
  summarizeRuntime,
} from "@/lib/runtime";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { StatGrid } from "@/components/design/StatGrid";
import { MaterialTable, type MaterialRow } from "@/components/design/MaterialTable";
import { ProjectNote } from "@/components/design/ProjectNote";
import { ReplyButton } from "@/components/design/ReplyButton";
import { AnimatedNumber } from "@/components/design/AnimatedNumber";
import { EntryRow } from "@/components/design/EntryRow";
import { RuntimeCard } from "@/components/design/RuntimeCard";
import { RuntimeRow } from "@/components/design/RuntimeRow";
import { phaseToCode } from "@/lib/phase-codes";
import { pctOfInward } from "@/lib/phase";

function fmtMT(n: number | null) {
  return (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function PhaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  const isAllTime = range === "all";

  // The 30-day window is computed here, outside the cache scope
  let since: string | null = null;
  if (!isAllTime) {
    // eslint-disable-next-line react-hooks/purity
    since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [session, phase, materials, entries] = await Promise.all([
    getSession(),
    getPhaseById(id),
    getPhaseMaterials(id),
    getPhaseEntries(id, since),
  ]);

  if (!phase) notFound();

  // If operator visits another agency's phase, redirect to home
  if (session?.role === "operator" && session.agency !== phase.agency) {
    redirect("/");
  }

  const isEditor = session?.role === "editor";
  const hasRuntime =
    phase.agency && (SCREEN_RUNTIME_AGENCIES as readonly string[]).includes(phase.agency);

  // Runtime summary always covers last 30 days
  const runtimeLogs = hasRuntime ? await getRuntimeLogs(id, thirtyDaysAgo) : [];
  const runtimeSummary = hasRuntime ? summarizeRuntime(runtimeLogs ?? []) : null;
  const latestRuntimeShifts = (runtimeLogs ?? []).slice(0, 2);

  const lossPct = pctOfInward(phase.balance_mt, phase.cumulative_inward_mt);
  const canAddEntry = canWriteAgency(session, phase.agency ?? "");
  const canAddRuntime = canWriteAgency(session, phase.agency ?? "");

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`PHASE ${phase.phase} · ${phase.agency!.toUpperCase()}`}
        backHref="/"
      />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3 animate-fade-in">
        <Window title="ORDER SUMMARY">
          <StatGrid
            stats={[
              { label: "ORDER QTY", numericValue: phase.order_qty_mt, value: fmtMT(phase.order_qty_mt) },
              { label: "CUM. INWARD", numericValue: phase.cumulative_inward_mt, value: fmtMT(phase.cumulative_inward_mt) },
              { label: "CUM. DISPOSED", numericValue: phase.cumulative_disposed_mt, value: fmtMT(phase.cumulative_disposed_mt) },
              {
                label: phase.status === "Completed" ? "PROCESSING LOSS" : "BALANCE QTY",
                numericValue: phase.balance_mt,
                value: fmtMT(phase.balance_mt),
                accent: true,
              },
            ]}
          />
          <div className="mt-2.5 grid grid-cols-2 gap-3.5 border-t border-ink pt-2.5">
            <div>
              <div className="font-mono text-2xl font-bold">
                <AnimatedNumber value={Math.round(phase.pct_of_order ?? 0)} decimals={0} suffix="%" />
              </div>
              <div className="font-mono text-[10px] tracking-wide text-muted">OF ORDER QTY</div>
            </div>
            {lossPct !== null && (
              <div>
                <div className="font-mono text-2xl font-bold text-accent-ink">
                  <AnimatedNumber value={lossPct} decimals={1} suffix="%" />
                </div>
                <div className="font-mono text-[10px] tracking-wide text-muted">
                  {phase.status === "Completed" ? "LOSS OF INWARD" : "BALANCE OF INWARD"}
                </div>
              </div>
            )}
          </div>
          {isEditor && (
            <div className="mt-2.5 flex justify-end border-t border-sage/70 pt-2.5">
              <Link
                href={`/phase/${id}/edit`}
                className="min-h-[32px] rounded-control border border-ink px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
              >
                EDIT PHASE
              </Link>
            </div>
          )}
        </Window>

        {session?.role !== "operator" && (
          <ProjectNote
            phaseAgencyId={id}
            initialNote={phase.current_note}
            isEditor={isEditor}
          />
        )}

        <Window title="MATERIAL BREAKDOWN">
          <MaterialTable rows={(materials ?? []) as MaterialRow[]} />
        </Window>

        {hasRuntime && (
          <RuntimeCard
            summary={runtimeSummary}
            addHref={canAddRuntime ? `/runtime/new?phase=${id}` : null}
            fullLogHref={`/phase/${id}/runtime`}
          >
            {latestRuntimeShifts.length === 0 ? (
              <p className="py-2 text-xs text-muted">No runtime logged yet.</p>
            ) : (
              latestRuntimeShifts.map((log) => (
                <RuntimeRow
                  key={log.id}
                  log={log}
                  canEdit={canEditRecord(session, {
                    agency: phase.agency ?? "",
                    created_by: log.created_by,
                  })}
                />
              ))
            )}
          </RuntimeCard>
        )}

        <Window title="ENTRIES">
          {canAddEntry && (
            <Link
              href={`/entry/new?phase=${id}`}
              className="mb-2.5 block rounded-control border border-ink bg-ink py-2 text-center font-mono text-xs font-bold tracking-wide text-paper"
            >
              + ADD ENTRY
            </Link>
          )}

          <div className="mb-2.5 flex gap-1.5">
            <Link
              href={`/phase/${id}`}
              className={`rounded-control border border-ink px-2 py-1 font-mono text-[10px] ${
                !isAllTime ? "bg-ink text-paper" : ""
              }`}
            >
              LAST 30D
            </Link>
            <Link
              href={`/phase/${id}?range=all`}
              className={`rounded-control border border-ink px-2 py-1 font-mono text-[10px] ${
                isAllTime ? "bg-ink text-paper" : ""
              }`}
            >
              ALL TIME
            </Link>
          </div>

          {(entries ?? []).length === 0 && (
            <p className="font-mono text-xs text-muted">No entries in this range.</p>
          )}

          {(entries ?? []).map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              canEdit={canEditRecord(session, {
                agency: phase.agency ?? "",
                created_by: e.created_by,
              })}
            />
          ))}
        </Window>
      </div>
      <BottomNav active="home" isOperator={session?.role === "operator"}>
        <ReplyButton
          context={{
            label: `Bio-Mining Phase ${phase.phase} · ${phase.agency}`,
            path: `/phase/${id}`,
            shortPath: phase.phase && phase.agency ? `/p/${phaseToCode(phase.phase, phase.agency)}` : undefined,
          }}
          role={session?.role}
        />
      </BottomNav>
    </div>
  );
}
