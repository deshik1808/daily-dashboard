// components/design/RuntimeReportDownload.tsx
// Editor-only: pick a From and To date, then download the shift-wise runtime PDF.
// A plain GET form, so it needs no client JavaScript; the browser saves the file.
import {
  inputClass,
  buttonPrimaryClass,
} from "@/components/design/FormField";

export function RuntimeReportDownload({
  phaseId,
  defaultFrom,
  defaultTo,
}: {
  phaseId: string;
  defaultFrom: string;
  defaultTo: string;
}) {
  return (
    <details className="mb-2.5 rounded-control border border-ink">
      <summary className="min-h-[44px] cursor-pointer list-none px-3 py-3 text-center text-xs font-bold tracking-wide [&::-webkit-details-marker]:hidden">
        DOWNLOAD PDF
      </summary>
      <form
        method="get"
        action={`/api/phase/${phaseId}/runtime-report`}
        className="space-y-2.5 border-t border-ink/30 p-3"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block text-[10px] font-bold text-muted">
            FROM
            <input
              type="date"
              name="from"
              required
              defaultValue={defaultFrom}
              max={defaultTo}
              className={inputClass}
            />
          </label>
          <label className="block text-[10px] font-bold text-muted">
            TO
            <input
              type="date"
              name="to"
              required
              defaultValue={defaultTo}
              max={defaultTo}
              className={inputClass}
            />
          </label>
        </div>
        <button type="submit" className={`${buttonPrimaryClass} w-full`}>
          DOWNLOAD
        </button>
      </form>
    </details>
  );
}
