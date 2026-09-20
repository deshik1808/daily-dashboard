// components/design/MrfLogRow.tsx
// Compact row for the MRF list — one row per logged day.
// Thumbnail strip (first 3 photos + "+N" tile) + one-line note preview.

import Link from "next/link";
import { extractFirstLine, formatMrfDate } from "@/lib/mrf-dates";

export interface MrfLogRowProps {
  logDate: string;
  note: string;
  /** Pre-signed URLs for the first 3 photos. */
  thumbnails: string[];
  /** Total number of photos for the day. */
  totalPhotos: number;
}

export function MrfLogRow({ logDate, note, thumbnails, totalPhotos }: MrfLogRowProps) {
  const extra = totalPhotos - thumbnails.length;
  const preview = extractFirstLine(note);

  return (
    <Link
      href={`/mrf/${logDate}`}
      className="block rounded-window border border-ink/85 bg-paper transition-colors hover:bg-mist"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink/85 bg-mist px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            <span className="h-[7px] w-[7px] rounded-full bg-sage" />
          </span>
          <span>{formatMrfDate(logDate).toUpperCase()}</span>
        </div>
        <span className="text-muted" aria-hidden>›</span>
      </div>

      {/* Body */}
      <div className="p-2.5">
        {/* Thumbnail strip */}
        {thumbnails.length > 0 && (
          <div className="mb-2 flex gap-1.5">
            {thumbnails.map((url, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={url}
                alt=""
                className="h-[48px] w-[48px] flex-none rounded-control border border-ink/50 object-cover"
              />
            ))}
            {extra > 0 && (
              <span className="flex h-[48px] w-[48px] flex-none items-center justify-center rounded-control border border-sage bg-canvas font-mono text-[10px] font-bold text-muted">
                +{extra}
              </span>
            )}
          </div>
        )}

        {/* Note preview */}
        {preview && (
          <p className="line-clamp-1 text-[13px] text-ink/80">{preview}</p>
        )}
      </div>
    </Link>
  );
}
