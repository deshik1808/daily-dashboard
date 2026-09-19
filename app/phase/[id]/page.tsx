// app/phase/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { StatGrid } from "@/components/design/StatGrid";
import { MaterialTable, type MaterialRow } from "@/components/design/MaterialTable";

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    entriesQuery = entriesQuery.gte("report_date", thirtyDaysAgo);
  }

  const { data: entries, error: entriesError } = await entriesQuery;

  if (entriesError) {
    console.error("bio_mining_entries query failed", entriesError);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={`PHASE ${phase.phase} · ${phase.agency!.toUpperCase()}`} showBack />
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        <Window title="ORDER SUMMARY">
          <StatGrid
            stats={[
              { label: "ORDER QTY", value: fmtMT(phase.order_qty_mt) },
              { label: "CUM. INWARD", value: fmtMT(phase.cumulative_inward_mt) },
              { label: "CUM. DISPOSED", value: fmtMT(phase.cumulative_disposed_mt) },
              { label: "BALANCE", value: fmtMT(phase.balance_mt), accent: true },
            ]}
          />
          <div className="mt-2.5 flex items-baseline justify-between border-t border-ink pt-2.5">
            <span className="font-mono text-3xl font-bold">{Math.round(phase.pct_of_order!)}%</span>
            <span className="font-mono text-[11px] text-ink/60">OF ORDER QTY</span>
          </div>
        </Window>

        <Window title="MATERIAL BREAKDOWN">
          <MaterialTable rows={(materials ?? []) as MaterialRow[]} />
        </Window>

        <Window title="ENTRIES">
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
            <p className="font-mono text-xs text-ink/60">No entries in this range.</p>
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
                className="flex items-center justify-between border-b border-ink/20 py-2 last:border-b-0"
              >
                <div>
                  <div className="text-sm font-bold">
                    {new Date(e.report_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </div>
                  <div className="font-mono text-[10px] text-accent-blue">
                    {e.shift.toUpperCase()}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>IN {fmtMT(e.inward_mt)}</div>
                  <div className="text-ink/50">OUT {fmtMT(disposed)}</div>
                </div>
              </div>
            );
          })}
        </Window>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
