// components/design/RuntimeSummary.tsx
import { formatDuration, type RuntimeSummary } from "@/lib/runtime";
import { ScreenDot } from "@/components/design/ScreenDot";

export function RuntimeSummaryTable({
  summary,
  rangeLabel = "LAST 30 DAYS",
}: {
  summary: RuntimeSummary;
  rangeLabel?: string;
}) {
  const shiftText = summary.shifts === 1 ? "SHIFT" : "SHIFTS";

  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>
          {rangeLabel} · {summary.shifts} {shiftText}
        </span>
        <span className="font-bold tracking-wide text-ink">AVG PER SHIFT</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-sage/60 text-[10px] text-muted">
              <th className="py-1 font-normal">SCREEN</th>
              <th className="py-1 text-right font-normal">RUN</th>
              <th className="py-1 text-right font-normal">BREAKDOWN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/30">
            <tr>
              <td className="py-1.5 font-bold">
                <span className="flex items-center gap-1.5">
                  <ScreenDot screen="red" />
                  RED
                </span>
              </td>
              <td className="py-1.5 text-right font-bold text-ink">
                {formatDuration(summary.red.avgRunMin)}
              </td>
              <td className="py-1.5 text-right font-bold text-accent-ink">
                {summary.red.avgBreakdownMin > 0
                  ? formatDuration(summary.red.avgBreakdownMin)
                  : "—"}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 font-bold">
                <span className="flex items-center gap-1.5">
                  <ScreenDot screen="yellow" />
                  YELLOW
                </span>
              </td>
              <td className="py-1.5 text-right font-bold text-ink">
                {formatDuration(summary.yellow.avgRunMin)}
              </td>
              <td className="py-1.5 text-right font-bold text-accent-ink">
                {summary.yellow.avgBreakdownMin > 0
                  ? formatDuration(summary.yellow.avgBreakdownMin)
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
