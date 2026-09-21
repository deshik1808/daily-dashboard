// components/design/PhotoUploader.tsx
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { signMrfPhotoUrls } from "@/lib/supabase/storage";
import { compressImage, isHeicImage, TARGET_PHOTO_BYTES } from "@/lib/image-compression";
import {
  MRF_PHOTO_BUCKET,
  MAX_PHOTOS,
  buildPhotoPath,
  validatePhotoType,
  validateCompressedSize,
} from "@/lib/mrf";

interface PhotoUploaderProps {
  logDate: string;
  initialPaths?: string[];
  error?: string;
  onCountChange?: (count: number) => void;
}

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Uploads straight from the browser to Supabase Storage rather than through the
 * Server Action: Server Action request bodies are capped at 1 MB by default,
 * which a single phone photo blows past. Each photo is compressed to <= 250 KB
 * automatically first (PRD S4) - there is no manual compression step.
 */
export function PhotoUploader({
  logDate,
  initialPaths = [],
  error,
  onCountChange,
}: PhotoUploaderProps) {
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The bucket is private, so previews need short-lived signed URLs.
  useEffect(() => {
    const missing = paths.filter((p) => !urls[p]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const signed = await signMrfPhotoUrls(createClient(), missing);
      if (!cancelled && Object.keys(signed).length > 0) {
        setUrls((prev) => ({ ...prev, ...signed }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paths, urls]);

  function commit(next: string[]) {
    setPaths(next);
    onCountChange?.(next.length);
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setLocalError(null);

    if (paths.length + files.length > MAX_PHOTOS) {
      setLocalError(`You can attach at most ${MAX_PHOTOS} photos`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Type is checked up front; size is checked after compression, since the
    // original is routinely larger than the bucket ceiling.
    for (const file of files) {
      const typeError = validatePhotoType(file);
      if (typeError) {
        setLocalError(`${file.name}: ${typeError}`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setBusy(true);
    const supabase = createClient();
    const uploaded: string[] = [];
    const datePart = logDate || new Date().toISOString().slice(0, 10);

    for (let i = 0; i < files.length; i++) {
      const original = files[i];
      const isHeic = isHeicImage(original);
      setStatus(
        isHeic
          ? `CONVERTING HEIC ${i + 1}/${files.length}...`
          : `COMPRESSING ${i + 1}/${files.length}...`
      );

      const { file, originalBytes, compressedBytes, skipped } = await compressImage(original);
      if (skipped) {
        if (isHeic) {
          setLocalError(`${original.name}: Could not convert HEIC photo. Please upload a JPEG or PNG instead.`);
          break;
        }
        console.warn("could not decode for compression, uploading original", original.name);
      }

      const sizeError = validateCompressedSize(file.size);
      if (sizeError) {
        setLocalError(`${original.name}: ${sizeError}`);
        break;
      }

      setStatus(
        `UPLOADING ${i + 1}/${files.length} · ${kb(originalBytes)} -> ${kb(compressedBytes)}`
      );

      const path = buildPhotoPath(datePart, file.name, crypto.randomUUID());
      const { error: uploadError } = await supabase.storage
        .from(MRF_PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        console.error("photo upload failed", uploadError);
        setLocalError(
          uploadError.message.toLowerCase().includes("bucket")
            ? "Photo storage is not set up yet. Apply migration 0007_mrf_photos.sql."
            : `Could not upload ${original.name}: ${uploadError.message}`
        );
        break;
      }
      uploaded.push(path);
    }

    setBusy(false);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded.length > 0) commit([...paths, ...uploaded]);
  }

  async function handleRemove(path: string) {
    commit(paths.filter((p) => p !== path));
    const supabase = createClient();
    const { error: removeError } = await supabase.storage.from(MRF_PHOTO_BUCKET).remove([path]);
    if (removeError) {
      // The form no longer references it; a leftover object is harmless.
      console.error("could not remove photo from storage", removeError);
    }
  }

  const shown = error ?? localError;

  return (
    <div>
      <span className="font-mono text-[10px] font-bold tracking-wide text-muted">
        PHOTOS (REQUIRED)
      </span>

      {paths.map((path) => (
        <input key={path} type="hidden" name="photo_paths" value={path} />
      ))}

      {paths.length > 0 && (
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {paths.map((path) => (
            <div key={path} className="relative">
              {urls[path] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={urls[path]}
                  alt=""
                  className="h-20 w-full rounded-control border border-ink object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="h-20 w-full rounded-control border border-ink bg-mist"
                />
              )}
              <button
                type="button"
                onClick={() => handleRemove(path)}
                aria-label="Remove photo"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-ink bg-paper font-mono text-[10px] font-bold leading-none"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={handleFiles}
        disabled={busy || paths.length >= MAX_PHOTOS}
        className="mt-1.5 w-full rounded-control border border-ink px-2 py-1.5 font-mono text-[11px] file:mr-2 file:rounded-control file:border file:border-ink file:bg-paper file:px-2 file:py-1 file:font-mono file:text-[10px] file:font-bold disabled:opacity-50"
      />

      <p className="mt-1 font-mono text-[10px] text-muted">
        {status ??
          `${paths.length}/${MAX_PHOTOS} ATTACHED · AUTO-COMPRESSED TO ~${kb(
            TARGET_PHOTO_BYTES
          )} · MAX 1600PX`}
      </p>

      {shown && (
        <p role="alert" className="mt-0.5 font-mono text-[10px] text-alert">
          {shown}
        </p>
      )}
    </div>
  );
}
