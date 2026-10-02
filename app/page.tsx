import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPhaseTotals, getLatestMrfLogDate } from "@/lib/data";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { Chip } from "@/components/design/Chip";
import { signOut } from "@/app/actions/sign-out";
import { ReplyButton } from "@/components/design/ReplyButton";
import { NotificationBell } from "@/components/PushSubscription";

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
  const [session, phases, mrfLatestDate] = await Promise.all([
    getSession(),
    getPhaseTotals(),
    getLatestMrfLogDate(),
  ]);

  const isOperator = session?.role === "operator";
  const isEditor = session?.role === "editor";
  const isViewer = session?.role === "viewer";

  type Card = {
    key: string;
    title: string;
    agency: string;
    lastReportDate: string | null;
    completed: boolean;
    content: React.ReactNode;
  };

  // For the operator: only phases of his agency, and no MRF card
  const filteredPhases = isOperator
    ? (phases ?? []).filter((p) => p.agency === session.agency)
    : (phases ?? []);

  const bioMiningCards: Card[] = filteredPhases.map((p) => ({
    key: p.phase_agency_id ?? `phase-${p.phase}-${p.agency}`,
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
  const cardList = isOperator ? bioMiningCards : [...bioMiningCards, mrfCard];
  const cards = cardList.sort((a, b) => statusRank(a) - statusRank(b));

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="PROJECT STATUS"
        action={isEditor ? <NotificationBell /> : undefined}
      />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3 animate-fade-in font-mono">
        <div className="mb-1 text-xs">
          {isEditor ? (
            <div className="flex items-center justify-between">
              <Link href="/login" className="text-accent-ink underline font-bold">
                EDITOR SETTINGS
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-muted hover:underline">
                  SIGN OUT
                </button>
              </form>
            </div>
          ) : isViewer ? (
            <div className="flex items-center justify-between">
              <span className="text-muted font-bold">SIGNED IN AS VIEWER</span>
              <form action={signOut}>
                <button type="submit" className="text-muted hover:underline">
                  SIGN OUT
                </button>
              </form>
            </div>
          ) : isOperator ? (
            <div className="flex items-center justify-between">
              <span className="text-muted font-bold">SIGNED IN AS OPERATOR</span>
              <form action={signOut}>
                <button type="submit" className="text-muted hover:underline">
                  SIGN OUT
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Link href="/login" className="text-accent-ink underline">
                LOGIN
              </Link>
            </div>
          )}
        </div>

        {cards.map((c) => (
          <Window key={c.key} title={c.title}>
            {c.content}
          </Window>
        ))}
      </div>
      <BottomNav active="home" isOperator={isOperator}>
        <ReplyButton
          context={{ label: "Home — all projects", path: "/" }}
          role={session?.role}
        />
      </BottomNav>
    </div>
  );
}
