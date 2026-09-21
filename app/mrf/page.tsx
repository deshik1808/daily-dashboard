// app/mrf/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isEditor } from "@/lib/auth";
import { getMrfLogs } from "@/lib/data";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { MrfLogRow } from "@/components/design/MrfLogRow";
import { signMrfPhotoUrls } from "@/lib/supabase/storage";
import { ReplyButton } from "@/components/design/ReplyButton";

/** Maximum number of photos to sign per log in the compact list. */
const THUMB_LIMIT = 3;

export default async function MrfPage() {
  // The log list is cached; only the photo signing below needs a live,
  // cookie-bound client, because signed storage URLs are short-lived and so
  // must not be cached alongside the rows.
  const [user, logs, supabase] = await Promise.all([
    isEditor(),
    getMrfLogs(30),
    createClient(),
  ]);

  // Only sign the first 3 photo paths per log (max 90 signed URLs total).
  const pathsToSign = (logs ?? []).flatMap((log) =>
    (log.photo_paths ?? []).slice(0, THUMB_LIMIT)
  );
  const photoUrls = await signMrfPhotoUrls(supabase, pathsToSign);

  return (
    <div className="flex h-full flex-col">
      <TopBar title="MRF PLANT · RAGHURAM HUME PIPES" backHref="/" />
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3 animate-fade-in">
        {user && (
          <Link
            href="/mrf/new"
            className="block rounded-control border border-ink bg-ink py-2 text-center font-mono text-xs font-bold tracking-wide text-paper"
          >
            + ADD LOG
          </Link>
        )}

        {(logs ?? []).length === 0 && (
          <Window title="LOGS">
            <p className="font-mono text-xs text-muted">No logs recorded yet.</p>
          </Window>
        )}

        {(logs ?? []).map((log) => {
          const allPaths = log.photo_paths ?? [];
          const thumbPaths = allPaths.slice(0, THUMB_LIMIT);
          const thumbnails = thumbPaths
            .filter((path) => photoUrls[path])
            .map((path) => photoUrls[path]);

          return (
            <MrfLogRow
              key={log.id}
              logDate={log.log_date}
              note={log.note}
              thumbnails={thumbnails}
              totalPhotos={allPaths.length}
            />
          );
        })}
      </div>
      <BottomNav active="home">
        <ReplyButton context={{ label: "MRF Plant · all logs", path: "/mrf" }} isEditor={user} />
      </BottomNav>
    </div>
  );
}
