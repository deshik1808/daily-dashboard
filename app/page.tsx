import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { Chip } from "@/components/design/Chip";

const LOCATION: Record<string, string> = {
  Zigma: "Ramapuram",
  "Card Box": "Ramapuram",
};

function formatDate(d: string | null) {
  if (!d) return "no reports yet";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: phases, error: phasesError } = await supabase
    .from("phase_totals")
    .select("phase_agency_id, phase, agency, status, pct_of_order, last_report_date")
    .order("phase", { ascending: true });

  if (phasesError) {
    console.error("phase_totals query failed", phasesError);
  }

  const { data: mrfLatest, error: mrfError } = await supabase
    .from("mrf_logs")
    .select("log_date")
    .is("deleted_at", null)
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mrfError) {
    console.error("mrf_logs query failed", mrfError);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title="PROJECT STATUS" />
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {!user && (
          <p className="mb-1 font-mono text-xs">
            <Link href="/login" className="text-accent-blue">
              EDITOR LOGIN
            </Link>
          </p>
        )}

        {(phases ?? []).map((p) => (
          <Link key={p.phase_agency_id} href={`/phase/${p.phase_agency_id}`} className="block">
            <Window title={`BIO-MINING · PHASE ${p.phase} · ${p.agency!.toUpperCase()}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-bold">{LOCATION[p.agency!] ?? ""}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-ink/60">
                    UPD. {formatDate(p.last_report_date).toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold">{Math.round(p.pct_of_order!)}%</div>
                  <Chip variant={p.status === "Completed" ? "done" : "progress"}>
                    {p.status!.toUpperCase()}
                  </Chip>
                </div>
              </div>
            </Window>
          </Link>
        ))}

        <Window title="MRF PLANT · RAGHURAM HUME">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold">Thukivakam</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink/60">
                UPD. {formatDate(mrfLatest?.log_date ?? null).toUpperCase()}
              </div>
            </div>
            <Chip variant="progress">IN PROGRESS</Chip>
          </div>
        </Window>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
