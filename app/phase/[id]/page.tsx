// app/phase/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { isEditor as getIsEditor } from "@/lib/auth";
import { getPhaseById, getPhaseMaterials, getPhaseEntries } from "@/lib/data";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { StatGrid } from "@/components/design/StatGrid";
import { MaterialTable, type MaterialRow } from "@/components/design/MaterialTable";
import { ProjectNote } from "@/components/design/ProjectNote";
import { ReplyButton } from "@/components/design/ReplyButton";
import { AnimatedNumber } from "@/components/design/AnimatedNumber";
import { EntryRow } from "@/components/design/EntryRow";
import { phaseToCode } from "@/lib/phase-codes";

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

  // The 30-day window is computed here, outside the cache scope: a `use cache`
  // function must be deterministic, so baking `Date.now()` into one would pin
  // the cached entry to whatever day it was first rendered.
  let since: string | null = null;
  if (!isAllTime) {
    // eslint-disable-next-line react-hooks/purity
    since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  // All cached except the session check, which is a local token verification.
  const [isEditor, phase, materials, entries] = await Promise.all([
    getIsEditor(),
    getPhaseById(id),
    getPhaseMaterials(id),
    getPhaseEntries(id, since),
  ]);

  if (!phase) notFound();

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
          <div className="mt-2.5 flex items-baseline justify-between border-t border-ink pt-2.5">
            <span className="font-mono text-3xl font-bold">
              <AnimatedNumber value={Math.round(phase.pct_of_order ?? 0)} decimals={0} suffix="%" />
            </span>
            <span className="font-mono text-[11px] text-muted">OF ORDER QTY</span>
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

        <ProjectNote
          phaseAgencyId={id}
          initialNote={phase.current_note}
          isEditor={isEditor}
        />

        <Window title="MATERIAL BREAKDOWN">
          <MaterialTable rows={(materials ?? []) as MaterialRow[]} />
        </Window>

        <Window title="ENTRIES">
          {isEditor && (
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
            <EntryRow key={e.id} entry={e} isEditor={isEditor} />
          ))}
        </Window>
      </div>
      <BottomNav active="home">
        <ReplyButton
          context={{
            label: `Bio-Mining Phase ${phase.phase} · ${phase.agency}`,
            path: `/phase/${id}`,
            shortPath: phase.phase && phase.agency ? `/p/${phaseToCode(phase.phase, phase.agency)}` : undefined,
          }}
          isEditor={isEditor}
        />
      </BottomNav>
    </div>
  );
}
