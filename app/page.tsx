import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { Chip } from "@/components/design/Chip";
import { signOut } from "@/app/actions/sign-out";
import { ReplyButton } from "@/components/design/ReplyButton";

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
    console.error("phase_totals query failed:", phasesError.message);
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

  // In-progress cards lead, completed ones stack at the bottom (PRD: surface
  // active work first). Each group keeps phase order; MRF is always in-progress.
  type Card = {
    key: string;
    title: string;
    location: string;
    lastReportDate: string | null;
    completed: boolean;
    content: React.ReactNode;
  };

  const bioMiningCards: Card[] = (phases ?? []).map((p) => ({
    key: p.phase_agency_id ?? `phase-${p.phase}-${p.agency}`,
    title: `BIO-MINING · PHASE ${p.phase} · ${p.agency!.toUpperCase()}`,
    location: LOCATION[p.agency!] ?? "",
    lastReportDate: p.last_report_date,
    completed: p.status === "Completed",
    content: (
      <Link href={`/phase/${p.phase_agency_id}`} className="block">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold">{LOCATION[p.agency!] ?? ""}</div>
            <div className="mt-0.5 font-mono text-[11px] text-muted">
              UPD. {formatDate(p.last_report_date).toUpperCase()}
            </div>
          </div>
          <Chip variant={p.status === "Completed" ? "done" : "progress"}>
            {p.status!.toUpperCase()}
          </Chip>
        </div>
      </Link>
    ),
  }));

  const mrfCard: Card = {
    key: "mrf-plant",
    title: "MRF PLANT · RAGHURAM HUME PIPES",
    location: "Thukivakam",
    lastReportDate: mrfLatest?.log_date ?? null,
    completed: false,
    content: (
      <Link href="/mrf" className="block">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold">Thukivakam</div>
            <div className="mt-0.5 font-mono text-[11px] text-muted">
              UPD. {formatDate(mrfLatest?.log_date ?? null).toUpperCase()}
            </div>
          </div>
          <Chip variant="progress">IN PROGRESS</Chip>
        </div>
      </Link>
    ),
  };

  const statusRank = (c: Card) => (c.completed ? 1 : 0);
  const cards = [...bioMiningCards, mrfCard].sort(
    (a, b) => statusRank(a) - statusRank(b),
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar title="PROJECT STATUS" />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3">
        <div className="mb-1 font-mono text-xs">
          {user ? (
            <div className="flex items-center justify-between">
              <Link href="/login" className="text-accent-ink underline">
                EDITOR SETTINGS
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-muted hover:underline">
                  SIGN OUT
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="text-accent-ink">
              EDITOR LOGIN
            </Link>
          )}
        </div>

        {cards.map((c) => (
          <Window key={c.key} title={c.title}>
            {c.content}
          </Window>
        ))}
      </div>
      <BottomNav active="home" />
      <ReplyButton context={{ label: "Home — all projects", path: "/" }} isEditor={!!user} />
    </div>
  );
}
