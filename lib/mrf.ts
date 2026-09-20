// lib/mrf.ts
// Pure validation + normalization for MRF plant log form data.
// Both a note and at least one photo are mandatory (see 0007_mrf_photos.sql).

import { validateReportDate } from "./entries.ts";

export const MRF_PHOTO_BUCKET = "mrf-photos";
export const MIN_PHOTOS = 1;
export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export interface MrfLogValues {
  log_date: string;
  note: string;
  photo_paths: string[];
}

export interface MrfLogValidationResult {
  valid: boolean;
  value?: MrfLogValues;
  errors?: Record<string, string>;
}

/**
 * Storage object keys we wrote ourselves. Rejects traversal and absolute paths
 * so a tampered form cannot point photo_paths at another bucket prefix.
 */
export function normalizePhotoPaths(raw: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  const list = Array.isArray(raw) ? raw : raw === null || raw === undefined ? [] : [raw];

  const cleaned: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") return { ok: false, error: "Invalid photo reference" };
    const trimmed = item.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("/") || trimmed.includes("..")) {
      return { ok: false, error: "Invalid photo reference" };
    }
    if (!cleaned.includes(trimmed)) cleaned.push(trimmed);
  }

  if (cleaned.length < MIN_PHOTOS) {
    return { ok: false, error: "Add at least one photo" };
  }
  if (cleaned.length > MAX_PHOTOS) {
    return { ok: false, error: `No more than ${MAX_PHOTOS} photos` };
  }

  return { ok: true, value: cleaned };
}

export function validateMrfLog(raw: Record<string, unknown>, today: string): MrfLogValidationResult {
  const errors: Record<string, string> = {};

  const date = validateReportDate(raw.log_date, today);
  if (!date.ok) errors.log_date = date.error;

  let note = "";
  if (typeof raw.note === "string") {
    note = raw.note.trim();
  } else if (raw.note !== null && raw.note !== undefined) {
    errors.note = "Note must be text";
  }
  if (note === "" && !errors.note) {
    errors.note = "Note cannot be empty";
  }

  const photos = normalizePhotoPaths(raw.photo_paths);
  if (!photos.ok) errors.photo_paths = photos.error;

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    value: {
      log_date: date.ok ? date.value : "",
      note,
      photo_paths: photos.ok ? photos.value : [],
    },
  };
}

/** Builds the storage key for a freshly picked photo. */
export function buildPhotoPath(logDate: string, fileName: string, uniqueId: string): string {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const [year, month] = logDate.split("-");
  return `${year}/${month}/${uniqueId}.${ext}`;
}

/**
 * Pre-compression guard. Only the MIME type is checked here: the original may
 * be far larger than the bucket ceiling (modern phones shoot 20 MB+), and
 * compression is what brings it under. Rejecting on the original's size would
 * force the Editor to shrink photos by hand, which PRD S4 explicitly forbids.
 */
export function validatePhotoType(file: { type: string }): string | null {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPEG, PNG, WebP or HEIC images are allowed";
  }
  return null;
}

/**
 * Post-compression guard, mirroring the bucket's file_size_limit. Only reachable
 * when compression could not run at all (an undecodable original).
 */
export function validateCompressedSize(sizeBytes: number): string | null {
  if (sizeBytes > MAX_PHOTO_BYTES) {
    return "This photo is too large to upload and could not be compressed automatically";
  }
  return null;
}
