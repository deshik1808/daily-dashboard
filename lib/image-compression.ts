// lib/image-compression.ts
// Automatic photo compression (PRD S4: "<= 250 KB each, max 1600 px wide.
// Editor never compresses by hand"). Runs in the browser before upload; the
// Edge Function backstop re-compresses anything that still lands over target.
//
// The geometry/quality maths is kept pure and framework-free so it can be unit
// tested; only compressImage() touches canvas APIs.

export const MAX_PHOTO_WIDTH = 1600;
export const TARGET_PHOTO_BYTES = 250 * 1024;
export const COMPRESSED_MIME = "image/jpeg";

/** JPEG quality ladder, tried best-first until the blob fits the target. */
export const QUALITY_LADDER = [0.82, 0.7, 0.6, 0.5, 0.4] as const;

/**
 * Scales dimensions so width <= MAX_PHOTO_WIDTH, preserving aspect ratio.
 * Images already narrower than the cap are left alone (never upscaled).
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxWidth: number = MAX_PHOTO_WIDTH
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  if (width <= maxWidth) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.max(1, Math.round(height * scale)) };
}

/**
 * After the quality ladder is exhausted, shrink the raster itself. Returns the
 * next width to try, or null once shrinking further stops being worthwhile.
 */
export function nextFallbackWidth(currentWidth: number, minWidth = 640): number | null {
  const next = Math.round(currentWidth * 0.75);
  return next >= minWidth ? next : null;
}

/** A file already at or under target with an acceptable width needs no work. */
export function needsCompression(
  sizeBytes: number,
  width: number,
  targetBytes: number = TARGET_PHOTO_BYTES,
  maxWidth: number = MAX_PHOTO_WIDTH
): boolean {
  return sizeBytes > targetBytes || width > maxWidth;
}

export function replaceExtension(fileName: string, ext = "jpg"): string {
  const base = fileName.replace(/\.[^.]*$/, "");
  return `${base || "photo"}.${ext}`;
}

export interface CompressionResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  /** True when the browser could not decode the image (e.g. HEIC on Android). */
  skipped: boolean;
}

async function decode(file: File): Promise<{ bitmap: ImageBitmap | HTMLImageElement; width: number; height: number } | null> {
  // createImageBitmap is the fast path and handles orientation on modern browsers.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // fall through to the <img> path
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ bitmap: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, COMPRESSED_MIME, quality));
}

export function isHeicImage(file: { type?: string; name?: string }): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicImage(file) || typeof window === "undefined") {
    return file;
  }

  try {
    const heic2anyModule = await import("heic2any");
    const heic2any = heic2anyModule.default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    const newName = replaceExtension(file.name, "jpg");
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (err) {
    console.error("heic2any conversion failed:", err);
    return file;
  }
}

/**
 * Compresses to <= 250 KB / <= 1600 px wide. Never throws: if the browser can't
 * decode the file, the original is returned with skipped=true and the server
 * backstop deals with it, so a bad decode never blocks the Editor's upload.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalBytes = file.size;
  const wasHeic = isHeicImage(file);
  const sourceFile = wasHeic ? await convertHeicToJpeg(file) : file;
  const decoded = await decode(sourceFile);

  if (!decoded) {
    return { file: sourceFile, originalBytes, compressedBytes: originalBytes, skipped: true };
  }

  const { bitmap, width, height } = decoded;

  if (!wasHeic && !needsCompression(originalBytes, width)) {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
    return { file, originalBytes, compressedBytes: originalBytes, skipped: false };
  }

  let target = computeTargetDimensions(width, height);
  let best: Blob | null = null;

  // Outer loop shrinks the raster; inner loop walks the quality ladder.
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, target.width, target.height);

    for (const quality of QUALITY_LADDER) {
      const blob = await toBlob(canvas, quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= TARGET_PHOTO_BYTES) {
        best = blob;
        break;
      }
    }

    if (best && best.size <= TARGET_PHOTO_BYTES) break;

    const narrower = nextFallbackWidth(target.width);
    if (narrower === null) break;
    target = computeTargetDimensions(narrower, Math.round((target.height / target.width) * narrower), narrower);
  }

  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  // Only take the uncompressed version if it actually helped AND wasn't HEIC (HEIC must always become JPEG)
  if (!wasHeic && (!best || best.size >= originalBytes)) {
    return { file, originalBytes, compressedBytes: originalBytes, skipped: false };
  }

  const outputBlob = best ?? sourceFile;
  const compressed = new File([outputBlob], replaceExtension(file.name), {
    type: COMPRESSED_MIME,
    lastModified: Date.now(),
  });

  return {
    file: compressed,
    originalBytes,
    compressedBytes: compressed.size,
    skipped: false,
  };
}
