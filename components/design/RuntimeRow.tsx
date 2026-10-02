// components/design/RuntimeRow.tsx
import Link from "next/link";
import { formatDuration, type ScreenRuntimeLog } from "@/lib/runtime";
import { ScreenDot } from "@/components/design/ScreenDot";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).toUpperCase();
}

function Remark({ text }: { text: string }) {
  return (
    <p className="mt-0.5 pl-3.5 text-[11px] leading-snug text-muted">{text}</p>
  );
}

export function RuntimeRow({
  log,
  canEdit,
}: {
  log: ScreenRuntimeLog;
  canEdit: boolean;
}) {
  return (
    <div className="border-b border-sage/60 py-2.5 last:border-b-0 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="font-bold text-ink">
          {formatDate(log.log_date)} · {log.shift.toUpperCase()}
        </div>
        {canEdit && log.id && (
          <Link
            href={`/runtime/${log.id}`}
            className="rounded-control border border-ink px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-ink hover:text-paper"
            aria-label={`Edit runtime log for ${log.log_date} ${log.shift}`}
          >
            EDIT
          </Link>
        )}
      </div>

      <div className="mt-2 space-y-2 text-[11px]">
        {/* Red Screen */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <span className="flex items-center gap-1.5 font-bold">
              <ScreenDot screen="red" size="sm" />
              RED
            </span>
            <div className="flex items-center gap-3">
              <span>
                <span className="text-muted">run </span>
                <span className="font-bold">{formatDuration(log.red_runtime_min)}</span>
              </span>
              <span>
                <span className="text-muted">breakdown </span>
                {log.red_breakdown_min > 0 ? (
                  <span className="font-bold text-accent-ink">
                    {formatDuration(log.red_breakdown_min)}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </span>
            </div>
          </div>
          {log.red_breakdown_reasons && <Remark text={log.red_breakdown_reasons} />}
        </div>

        {/* Yellow Screen */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <span className="flex items-center gap-1.5 font-bold">
              <ScreenDot screen="yellow" size="sm" />
              YELLOW
            </span>
            <div className="flex items-center gap-3">
              <span>
                <span className="text-muted">run </span>
                <span className="font-bold">{formatDuration(log.yellow_runtime_min)}</span>
              </span>
              <span>
                <span className="text-muted">breakdown </span>
                {log.yellow_breakdown_min > 0 ? (
                  <span className="font-bold text-accent-ink">
                    {formatDuration(log.yellow_breakdown_min)}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </span>
            </div>
          </div>
          {log.yellow_breakdown_reasons && <Remark text={log.yellow_breakdown_reasons} />}
        </div>
      </div>
    </div>
  );
}
