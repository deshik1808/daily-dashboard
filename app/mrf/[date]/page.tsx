// app/mrf/[date]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEditor } from "@/lib/auth";
import { getMrfLogByDate, getAdjacentMrfDates } from "@/lib/data";
import { TopBar } from "@/components/design/TopBar";
import { BottomNav } from "@/components/design/BottomNav";
import { Window } from "@/components/design/Window";
import { FormattedNote } from "@/components/design/FormattedNote";
import { PhotoGallery } from "@/components/design/PhotoGallery";
import { signMrfPhotoUrls } from "@/lib/supabase/storage";
import { formatMrfDate } from "@/lib/mrf-dates";
import { ReplyButton } from "@/components/design/ReplyButton";
import { MrfDateSwipe } from "@/components/design/MrfDateSwipe";

export default async function MrfDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // Validate the date format (YYYY-MM-DD).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const parsed = new Date(date + "T00:00:00Z");
  if (isNaN(parsed.getTime())) notFound();

  // Log and neighbours are cached; the live client is only needed for signing
  // storage URLs, which expire and so can't be cached with the rows.
  const [user, log, { prevDate, nextDate }, supabase] = await Promise.all([
    isEditor(),
    getMrfLogByDate(date),
    getAdjacentMrfDates(date),
    createClient(),
  ]);

  // Sign photo URLs if there's a log.
  const photoUrls = log
    ? await signMrfPhotoUrls(supabase, log.photo_paths ?? [])
    : {};

  const displayDate = formatMrfDate(date).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <TopBar title={`MRF · ${displayDate}`} backHref="/mrf" />
      <MrfDateSwipe
        prevDate={prevDate}
        nextDate={nextDate}
        className="flex-1 space-y-2.5 overflow-y-auto bg-canvas p-3"
      >
        {log ? (
          <>
            <Window title={displayDate}>
              <PhotoGallery
                photos={(log.photo_paths ?? [])
                  .filter((path) => photoUrls[path])
                  .map((path) => ({ path, url: photoUrls[path] }))}
              />
              {user && (
                <div className="mt-2.5 flex justify-end border-t border-sage/70 pt-2.5">
                  <Link
                    href={`/mrf/edit/${log.id}`}
                    className="min-h-[32px] rounded-control border border-ink px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
                  >
                    EDIT
                  </Link>
                </div>
              )}
            </Window>
            {(log.note ?? "").trim() ? (
              <Window title="NOTES">
                <FormattedNote content={log.note} />
              </Window>
            ) : null}
          </>
        ) : (
          <Window title="NO LOG">
            <p className="font-mono text-xs text-muted">
              No log recorded for {displayDate.toLowerCase()}.
            </p>
            <div className="mt-2.5">
              <Link
                href="/mrf"
                className="font-mono text-xs text-accent-ink underline"
              >
                ← BACK TO ALL LOGS
              </Link>
            </div>
          </Window>
        )}
      </MrfDateSwipe>
      <BottomNav active="home">
        <ReplyButton
          context={{
            label: `MRF Plant · ${formatMrfDate(date)}`,
            path: `/mrf/${date}`,
          }}
          isEditor={user}
        />
      </BottomNav>
    </div>
  );
}
