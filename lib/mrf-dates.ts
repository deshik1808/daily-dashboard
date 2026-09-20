// lib/mrf-dates.ts
// Date-code conversions for MRF short links and compact list utilities.

/**
 * Converts an ISO date string (e.g. "2026-09-20") to a 6-digit YYMMDD code (e.g. "260920").
 */
export function isoToYYMMDD(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return "";
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * Converts a 6-digit YYMMDD code (e.g. "260920") to an ISO date string (e.g. "2026-09-20").
 * Returns null if the code is invalid or represents an impossible date.
 */
export function yymmddToISO(code: string): string | null {
  if (!/^\d{6}$/.test(code)) return null;

  const yy = parseInt(code.slice(0, 2), 10);
  const mm = parseInt(code.slice(2, 4), 10);
  const dd = parseInt(code.slice(4, 6), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  // 20xx century assumption — valid for the project's lifetime.
  const year = 2000 + yy;
  const d = new Date(Date.UTC(year, mm - 1, dd));

  // Catch impossible dates like Feb 30 by checking the date components round-trip.
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== mm - 1 ||
    d.getUTCDate() !== dd
  ) {
    return null;
  }

  return d.toISOString().slice(0, 10);
}

const MAX_PREVIEW_LENGTH = 80;

/**
 * Extracts the first meaningful line from a note for the compact list preview.
 * - Skips blank leading lines.
 * - Strips bullet markers (•, -, *).
 * - Truncates with ellipsis only when the line was actually cut.
 */
export function extractFirstLine(note: string | null | undefined): string {
  if (!note) return "";

  const lines = note.split("\n");
  for (const raw of lines) {
    // Strip bullet marker if present.
    const stripped = raw.replace(/^\s*[•\-*]\s+/, "").trim();
    if (stripped.length === 0) continue;

    if (stripped.length > MAX_PREVIEW_LENGTH) {
      // Cut at the last space before the limit to avoid mid-word breaks.
      const cut = stripped.lastIndexOf(" ", MAX_PREVIEW_LENGTH);
      const end = cut > 0 ? cut : MAX_PREVIEW_LENGTH;
      return stripped.slice(0, end) + "…";
    }
    return stripped;
  }

  return "";
}

/**
 * Formats an ISO date string for display (e.g. "2026-09-20" → "20 SEPT 2026").
 */
export function formatMrfDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
