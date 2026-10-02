// components/design/RuntimeCard.tsx
// Compact, collapsed-by-default screen runtime card. The closed state is a single
// line with the 30-day averages; shifts and actions are one tap away.
import Link from "next/link";
import { formatDuration, type RuntimeSummary } from "@/lib/runtime";
import { ScreenDot } from "@/components/design/ScreenDot";

export function RuntimeCard({
  summary,
  addHref,
  fullLogHref,
  children,
}: {
  summary: RuntimeSummary | null;
  addHref: string | null;
  fullLogHref: string;
  children: React.ReactNode;
}) {
  const breakdownBits = summary
    ? [
        summary.red.avgBreakdownMin > 0 && `Red ${formatDuration(summary.red.avgBreakdownMin)}`,
        summary.yellow.avgBreakdownMin > 0 &&
          `Yellow ${formatDuration(summary.yellow.avgBreakdownMin)}`,
      ].filter(Boolean)
    : [];

  return (
    <details className="group overflow-hidden rounded-window border border-ink/85 bg-paper font-mono">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
        <span className="font-bold tracking-wide">SCREEN RUNTIME</span>
        <span className="flex items-center gap-2.5 text-[11px]">
          {summary ? (
            <>
              <span className="flex items-center gap-1">
                <ScreenDot screen="red" size="sm" />
                <span className="font-bold">{formatDuration(summary.red.avgRunMin)}</span>
              </span>
              <span className="flex items-center gap-1">
                <ScreenDot screen="yellow" size="sm" />
                <span className="font-bold">{formatDuration(summary.yellow.avgRunMin)}</span>
              </span>
            </>
          ) : (
            <span className="text-muted">No data</span>
          )}
          <span aria-hidden className="text-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>

      <div className="border-t border-sage/60 px-3 pb-3 pt-2">
        {summary && (
          <p className="text-[10px] text-muted">
            AVG PER SHIFT · LAST 30 DAYS · {summary.shifts}{" "}
            {summary.shifts === 1 ? "SHIFT" : "SHIFTS"}
            {breakdownBits.length > 0 && <> · BREAKDOWN {breakdownBits.join(", ")}</>}
          </p>
        )}

        <div className="mt-1">{children}</div>

        <div className="mt-2 flex items-center justify-between">
          {addHref ? (
            <Link
              href={addHref}
              className="min-h-[32px] rounded-control border border-ink px-2.5 py-1.5 text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
            >
              + ADD SHIFT RUNTIME
            </Link>
          ) : (
            <span />
          )}
          <Link href={fullLogHref} className="text-[11px] font-bold text-accent-ink hover:underline">
            FULL LOG →
          </Link>
        </div>
      </div>
    </details>
  );
}
