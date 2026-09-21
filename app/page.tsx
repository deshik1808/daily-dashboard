import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getPhaseTotals, getLatestMrfLogDate } from "@/lib/data";
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
  // The two data reads are cached (`lib/data.ts`), so on a warm cache they
  // cost no network at all. Only `isEditor()` is request-bound, and that is a
  // local JWT signature check — no round trip either. Between them, rendering
  // this page went from three serialized Supabase calls to none.
  const [user, phases, mrfLatestDate] = await Promise.all([
    isEditor(),
    getPhaseTotals(),
    getLatestMrfLogDate(),
  ]);

  // In-progress cards lead, completed ones stack at the bottom (PRD: surface
  // active work first). Each group keeps phase order; MRF is always in-progress.
  // The window title bar carries the location and the bold body line the agency
  // (swapped 2026-09-21 — see the Home/Phase detail design spec's amendment).
  type Card = {
    key: string;
    title: string;
    agency: string;
    lastReportDate: string | null;
    completed: boolean;
    content: React.ReactNode;
  };

  const bioMiningCards: Card[] = (phases ?? []).map((p) => ({
    key: p.phase_agency_id ?? `phase-${p.phase}-${p.agency}`,
    // Fall back to the agency when an agency has no mapped location yet, so the
    // title bar never ends on a dangling separator.
    title: `BIO-MINING · PHASE ${p.phase} · ${(LOCATION[p.agency!] ?? p.agency!).toUpperCase()}`,
    agency: p.agency!,
    lastReportDate: p.last_report_date,
    completed: p.status === "Completed",
    content: (
      <Link
        href={`/phase/${p.phase_agency_id}`}
        className="block transition-transform duration-100 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold">{p.agency}</div>
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
    title: "MRF PLANT · THUKIVAKAM",
    agency: "Raghuram Hume Pipes",
    lastReportDate: mrfLatestDate,
    completed: false,
    content: (
      <Link
        href="/mrf"
        className="block transition-transform duration-100 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold">Raghuram Hume Pipes</div>
            <div className="mt-0.5 font-mono text-[11px] text-muted">
              UPD. {formatDate(mrfLatestDate).toUpperCase()}
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
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3 animate-fade-in">
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
      <BottomNav active="home">
        <ReplyButton context={{ label: "Home — all projects", path: "/" }} isEditor={user} />
      </BottomNav>
    </div>
  );
}
