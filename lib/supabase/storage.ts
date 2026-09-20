// lib/supabase/storage.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { MRF_PHOTO_BUCKET } from "@/lib/mrf";

/** Signed URLs are short-lived by design (spec S6.4); one hour covers a page view. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Mints short-lived signed URLs for private mrf-photos objects.
 * The bucket has no public URL, so this is the only way to fetch the bytes.
 * Returns a path -> url map; paths that fail to sign are simply absent.
 */
export async function signMrfPhotoUrls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(MRF_PHOTO_BUCKET)
    .createSignedUrls(unique, expiresIn);

  if (error) {
    console.error("could not sign mrf photo urls", error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  }
  return map;
}
