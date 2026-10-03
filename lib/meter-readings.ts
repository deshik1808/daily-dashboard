// lib/meter-readings.ts
// Audit hour-meter readings behind runtime logs. Editor and operator only.
//
// Deliberately NOT in lib/data.ts: that file's reads are cached and shared by all
// viewers. These use the caller's own session, and RLS returns nothing to viewers.
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/access";
import type { MeterReadings } from "@/lib/runtime";

export type MeterReadingsByLog = Record<string, MeterReadings>;

export function canSeeMeterReadings(role: AppRole | null | undefined): boolean {
  return role === "editor" || role === "operator";
}

export async function getMeterReadings(
  role: AppRole | null | undefined,
  logIds: string[]
): Promise<MeterReadingsByLog> {
  if (!canSeeMeterReadings(role) || logIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screen_meter_readings")
    .select("runtime_log_id, red_open, red_close, yellow_open, yellow_close")
    .in("runtime_log_id", logIds);

  if (error) {
    console.error("screen_meter_readings query failed:", error.message);
    return {};
  }

  const out: MeterReadingsByLog = {};
  for (const row of data ?? []) {
    out[row.runtime_log_id] = {
      red_open: row.red_open,
      red_close: row.red_close,
      yellow_open: row.yellow_open,
      yellow_close: row.yellow_close,
    };
  }
  return out;
}
