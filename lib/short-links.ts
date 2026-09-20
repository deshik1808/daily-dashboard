// lib/short-links.ts
// Short-link cache backed by the `short_links` table and the is.gd API.
// The Editor mints links on save; viewers never call the shortener.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isoToYYMMDD } from "@/lib/mrf-dates";

const ISGD_API = "https://is.gd/create.php";
const TIMEOUT_MS = 3_000;

/**
 * Returns the app origin from env, falling back to the Vercel-provided host.
 */
function getAppOrigin(): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local development fallback.
  return "http://localhost:3000";
}

/**
 * Builds the `/m/YYMMDD` fallback path for a given ISO date.
 */
export function buildFallbackUrl(isoDate: string): string {
  const code = isoToYYMMDD(isoDate);
  return `${getAppOrigin()}/m/${code}`;
}

/**
 * Looks up or mints a short link for a canonical path.
 *
 * - Checks the `short_links` cache first.
 * - On cache miss, calls the is.gd API with a 3s timeout.
 * - On any failure (timeout, non-200, malformed response), returns null
 *   so the caller can fall back to `/m/YYMMDD`.
 *
 * Only call this from an authenticated context (Editor).
 */
export async function getOrCreateShortLink(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  canonicalPath: string
): Promise<string | null> {
  // 1. Check cache.
  const { data: cached } = await supabase
    .from("short_links")
    .select("short_url")
    .eq("path", canonicalPath)
    .maybeSingle();

  if (cached?.short_url) return cached.short_url;

  // 2. Mint via is.gd.
  const longUrl = `${getAppOrigin()}${canonicalPath}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const params = new URLSearchParams({
      format: "simple",
      url: longUrl,
    });

    const res = await fetch(`${ISGD_API}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`is.gd returned ${res.status} for ${longUrl}`);
      return null;
    }

    const shortUrl = (await res.text()).trim();
    if (!shortUrl.startsWith("http")) {
      console.warn(`is.gd returned unexpected body: ${shortUrl}`);
      return null;
    }

    // 3. Cache the result (best-effort; ignore insert errors).
    await supabase
      .from("short_links")
      .upsert({ path: canonicalPath, short_url: shortUrl })
      .select()
      .maybeSingle();

    return shortUrl;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`is.gd timed out for ${longUrl}`);
    } else {
      console.warn("is.gd fetch failed:", err);
    }
    return null;
  }
}

/**
 * Reads a cached short link without minting. Safe for anonymous viewers.
 */
export async function getCachedShortLink(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  canonicalPath: string
): Promise<string | null> {
  const { data } = await supabase
    .from("short_links")
    .select("short_url")
    .eq("path", canonicalPath)
    .maybeSingle();

  return data?.short_url ?? null;
}
