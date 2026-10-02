// lib/data.ts
// Cached reads of the dashboard's data.
//
// Every function here is a `use cache` scope over the reader client, so
// its result is shared by all viewers and can be prerendered into a route's
// static shell instead of being re-fetched on every visit.
//
// Freshness comes from tags, not short lifetimes: save actions call `revalidateTag`
// for whatever they touched, which also clears the client router cache immediately.
// That lets the lifetimes be generous without anyone ever seeing stale numbers after a save.
import { cacheLife, cacheTag } from "next/cache";
import { readerSupabase } from "@/lib/supabase/reader";
import { signMrfPhotoUrls } from "@/lib/supabase/storage";
import type { ScreenRuntimeLog } from "@/lib/runtime";

/** Tag names shared between these readers and the actions that invalidate them. */
export const TAGS = {
  phases: "phase-totals",
  mrfLogs: "mrf-logs",
  docNodes: "doc-nodes",
  entries: "bio-mining-entries",
  settings: "app-settings",
  shortLinks: "short-links",
  runtime: "screen-runtime-logs",
} as const;

export async function getPhaseTotals() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.phases);

  const { data, error } = await readerSupabase
    .from("phase_totals")
    .select("phase_agency_id, phase, agency, status, pct_of_order, last_report_date")
    .order("phase", { ascending: true });

  if (error) console.error("phase_totals query failed:", error.message);
  return data ?? [];
}

export async function getPhaseById(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.phases);

  const { data, error } = await readerSupabase
    .from("phase_totals")
    .select("*")
    .eq("phase_agency_id", id)
    .maybeSingle();

  if (error) console.error("phase_totals by id query failed:", error.message);
  return data;
}

export async function getPhaseMaterials(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.entries);

  const { data, error } = await readerSupabase
    .from("phase_material_breakdown")
    .select("material, disposed_mt, share_pct")
    .eq("phase_agency_id", id);

  if (error) console.error("phase_material_breakdown query failed:", error.message);
  return data ?? [];
}

/**
 * Entries for a phase, optionally windowed to recent history.
 *
 * `since` is passed in rather than computed here: a `use cache` scope must be
 * deterministic, and `Date.now()` inside one both breaks prerendering and would
 * silently bake a fixed date into the cache key.
 */
export async function getPhaseEntries(id: string, since: string | null) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.entries);

  let query = readerSupabase
    .from("bio_mining_entries")
    .select(
      "id, report_date, shift, inward_mt, soil_mt, rdf_mt, stones_mt, inert_mt, steel_mt, tyre_mt, wood_mt, glass_mt, iron_scrap_mt, wires_cables_mt, others_mt, created_by"
    )
    .eq("phase_agency_id", id)
    .is("deleted_at", null)
    .order("report_date", { ascending: false });

  if (since) query = query.gte("report_date", since);

  const { data, error } = await query;
  if (error) console.error("bio_mining_entries query failed:", error.message);
  return data ?? [];
}

/**
 * Screen runtime logs for a phase, optionally windowed to recent history.
 * Sorted newest first: by date descending, and Night before Day within a date.
 */
export async function getRuntimeLogs(
  phaseId: string,
  since: string | null
): Promise<ScreenRuntimeLog[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.runtime);

  let query = readerSupabase
    .from("screen_runtime_logs")
    .select(
      "id, phase_agency_id, log_date, shift, red_runtime_min, red_breakdown_min, red_breakdown_reasons, yellow_runtime_min, yellow_breakdown_min, yellow_breakdown_reasons, created_by"
    )
    .eq("phase_agency_id", phaseId)
    .is("deleted_at", null)
    .order("log_date", { ascending: false });

  if (since) query = query.gte("log_date", since);

  const { data, error } = await query;
  if (error) console.error("screen_runtime_logs query failed:", error.message);

  const rows = (data ?? []).slice();
  rows.sort((a, b) => {
    if (a.log_date !== b.log_date) {
      return b.log_date.localeCompare(a.log_date);
    }
    if (a.shift === b.shift) return 0;
    return a.shift === "Night" ? -1 : 1;
  });

  return rows as unknown as ScreenRuntimeLog[];
}

export async function getLatestMrfLogDate() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.mrfLogs);

  const { data, error } = await readerSupabase
    .from("mrf_logs")
    .select("log_date")
    .is("deleted_at", null)
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error("mrf_logs latest query failed:", error.message);
  return data?.log_date ?? null;
}

export async function getMrfLogs(limit = 30) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.mrfLogs);

  const { data, error } = await readerSupabase
    .from("mrf_logs")
    .select("id, log_date, note, photo_paths")
    .is("deleted_at", null)
    .order("log_date", { ascending: false })
    .limit(limit);

  if (error) console.error("mrf_logs query failed:", error.message);
  return data ?? [];
}

export async function getMrfLogByDate(date: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.mrfLogs);

  const { data, error } = await readerSupabase
    .from("mrf_logs")
    .select("id, log_date, note, photo_paths")
    .is("deleted_at", null)
    .eq("log_date", date)
    .maybeSingle();

  if (error) console.error("mrf_logs by date query failed:", error.message);
  return data;
}

/** The previous and next dates that actually have logs, for day-to-day paging. */
export async function getAdjacentMrfDates(date: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.mrfLogs);

  const [{ data: prevRows }, { data: nextRows }] = await Promise.all([
    readerSupabase
      .from("mrf_logs")
      .select("log_date")
      .is("deleted_at", null)
      .lt("log_date", date)
      .order("log_date", { ascending: false })
      .limit(1),
    readerSupabase
      .from("mrf_logs")
      .select("log_date")
      .is("deleted_at", null)
      .gt("log_date", date)
      .order("log_date", { ascending: true })
      .limit(1),
  ]);

  return {
    prevDate: prevRows?.[0]?.log_date ?? null,
    nextDate: nextRows?.[0]?.log_date ?? null,
  };
}

/**
 * Signed URLs for a day's photos, cached well inside their own lifetime.
 */
export async function getSignedMrfPhotoUrls(paths: string[]) {
  const unique = Array.from(new Set(paths.filter(Boolean))).sort();
  if (unique.length === 0) return {};
  return signedUrlsFor(unique);
}

async function signedUrlsFor(paths: string[]) {
  "use cache";
  cacheLife({ stale: 600, revalidate: 900, expire: 1800 });
  cacheTag(TAGS.mrfLogs);

  return signMrfPhotoUrls(readerSupabase, paths);
}

export async function getDocNodes() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.docNodes);

  const { data, error } = await readerSupabase
    .from("doc_nodes")
    .select("id, parent_id, kind, title, url, created_by, created_at, updated_at");

  if (error) console.error("doc_nodes query failed:", error.message);
  return data ?? [];
}

/**
 * The WhatsApp number the reply pill deep-links to.
 */
export async function getReplyNumber(): Promise<string> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.settings);

  const { data } = await readerSupabase
    .from("app_settings")
    .select("value")
    .eq("key", "reply_whatsapp_number")
    .maybeSingle();

  const stored = data?.value?.trim();
  if (stored) return stored;

  return process.env.REPLY_WHATSAPP_NUMBER || "910000000000";
}

/**
 * The minted short URL for a path, if one has been cached in `short_links`.
 */
export async function getShortLink(canonicalPath: string): Promise<string | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.shortLinks);

  const { data } = await readerSupabase
    .from("short_links")
    .select("short_url")
    .eq("path", canonicalPath)
    .maybeSingle();

  return data?.short_url ?? null;
}
