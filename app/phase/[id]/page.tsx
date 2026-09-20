// app/phase/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { StatGrid } from "@/components/design/StatGrid";
import { MaterialTable, type MaterialRow } from "@/components/design/MaterialTable";
import { ProjectNote } from "@/components/design/ProjectNote";
import { ReplyButton } from "@/components/design/ReplyButton";

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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isEditor = !!user;

  const { data: phase, error: phaseError } = await supabase
    .from("phase_totals")
    .select("*")
    .eq("phase_agency_id", id)
    .maybeSingle();

  if (phaseError) {
    console.error("phase_totals query failed", phaseError);
  }

  if (!phase) notFound();

  const { data: materials, error: materialsError } = await supabase
    .from("phase_material_breakdown")
    .select("material, disposed_mt, share_pct")
    .eq("phase_agency_id", id);

  if (materialsError) {
    console.error("phase_material_breakdown query failed", materialsError);
  }

  let entriesQuery = supabase
    .from("bio_mining_entries")
    .select(
      "id, report_date, shift, inward_mt, soil_mt, rdf_mt, stones_mt, inert_mt, steel_mt, tyre_mt, wood_mt, glass_mt, iron_scrap_mt, wires_cables_mt, others_mt"
    )
    .eq("phase_agency_id", id)
    .is("deleted_at", null)
    .order("report_date", { ascending: false });

  if (!isAllTime) {
    // eslint-disable-next-line react-hooks/purity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    entriesQuery = entriesQuery.gte("report_date", thirtyDaysAgo);
  }

  const { data: entries, error: entriesError } = await entriesQuery;

  if (entriesError) {
    console.error("bio_mining_entries query failed", entriesError);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`PHASE ${phase.phase} · ${phase.agency!.toUpperCase()}`}
        backHref="/"
      />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <Window title="ORDER SUMMARY">
          <StatGrid
            stats={[
              { label: "ORDER QTY", value: fmtMT(phase.order_qty_mt) },
              { label: "CUM. INWARD", value: fmtMT(phase.cumulative_inward_mt) },
              { label: "CUM. DISPOSED", value: fmtMT(phase.cumulative_disposed_mt) },
              { label: "PROCESSING LOSS", value: fmtMT(phase.balance_mt), accent: true },
            ]}
          />
          <div className="mt-2.5 flex items-baseline justify-between border-t border-ink pt-2.5">
            <span className="font-mono text-3xl font-bold">{Math.round(phase.pct_of_order!)}%</span>
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

          {(entries ?? []).map((e) => {
            const disposed =
              (e.soil_mt ?? 0) +
              (e.rdf_mt ?? 0) +
              (e.stones_mt ?? 0) +
              (e.inert_mt ?? 0) +
              (e.steel_mt ?? 0) +
              (e.tyre_mt ?? 0) +
              (e.wood_mt ?? 0) +
              (e.glass_mt ?? 0) +
              (e.iron_scrap_mt ?? 0) +
              (e.wires_cables_mt ?? 0) +
              (e.others_mt ?? 0);
            return (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 border-b border-sage/70 py-2 last:border-b-0"
              >
                <div>
                  <div className="text-sm font-bold">
                    {new Date(e.report_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </div>
                  <div className="font-mono text-[10px] text-muted">
                    {e.shift.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono text-xs">
                    <div>IN {fmtMT(e.inward_mt)}</div>
                    <div className="text-muted">OUT {fmtMT(disposed)}</div>
                  </div>
                  {isEditor && (
                    <Link
                      href={`/entry/${e.id}`}
                      aria-label={`Edit entry for ${e.report_date}`}
                      className="min-h-[32px] shrink-0 rounded-control border border-ink px-2 py-1 font-mono text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
                    >
                      EDIT
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </Window>
      </div>
      <BottomNav active="home" />
      <ReplyButton
        context={{
          label: `Bio-Mining Phase ${phase.phase} · ${phase.agency}`,
          path: `/phase/${id}`,
        }}
        isEditor={isEditor}
      />
    </div>
  );
}
