// supabase/functions/compress-mrf-photo/index.ts
//
// Server-side backstop for the photo pipeline (design spec S6.3): re-compresses
// any mrf-photos object that lands above 250 KB, for the edge cases the browser
// pass misses (e.g. HEIC that the client could not decode).
//
// Invoked by the storage-insert trigger in 0008_mrf_photo_backstop.sql.
// verify_jwt is disabled because the caller is the database, not a user
// session; the COMPRESS_HOOK_SECRET shared secret is what authenticates it.
//
// Runs asynchronously and never blocks the Editor's upload flow: it always
// returns 200 so a failure here cannot surface as an upload error.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const BUCKET = "mrf-photos";
const TARGET_BYTES = 250 * 1024;
const MAX_WIDTH = 1600;
const QUALITY_LADDER = [80, 70, 60, 50, 40];

interface StorageWebhookPayload {
  type?: string;
  record?: { bucket_id?: string; name?: string };
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    // Shared-secret auth. An unset secret means "not configured": refuse rather
    // than silently accepting anonymous calls.
    const expected = Deno.env.get("COMPRESS_HOOK_SECRET");
    if (!expected || req.headers.get("x-compress-hook-secret") !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const payload = (await req.json()) as StorageWebhookPayload;
    const record = payload.record ?? {};

    if (record.bucket_id !== BUCKET || !record.name) {
      return ok({ skipped: "not an mrf-photos object" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const path = record.name;
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (downloadError || !blob) {
      console.error("backstop: download failed", path, downloadError);
      return ok({ skipped: "download failed" });
    }

    const originalBytes = blob.size;
    if (originalBytes <= TARGET_BYTES) {
      return ok({ skipped: "already within target", originalBytes });
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());

    let image: Image;
    try {
      const decoded = await decode(bytes);
      if (!(decoded instanceof Image)) {
        return ok({ skipped: "unsupported image kind" });
      }
      image = decoded;
    } catch (err) {
      // Nothing more we can do server-side either; leave the original in place.
      console.error("backstop: decode failed", path, err);
      return ok({ skipped: "decode failed" });
    }

    if (image.width > MAX_WIDTH) {
      image.resize(MAX_WIDTH, Image.RESIZE_AUTO);
    }

    let out: Uint8Array | null = null;
    for (const quality of QUALITY_LADDER) {
      const encoded = await image.encodeJPEG(quality);
      if (!out || encoded.length < out.length) out = encoded;
      if (encoded.length <= TARGET_BYTES) {
        out = encoded;
        break;
      }
    }

    if (!out || out.length >= originalBytes) {
      return ok({ skipped: "no size win", originalBytes });
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .update(path, out, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.error("backstop: re-upload failed", path, uploadError);
      return ok({ skipped: "re-upload failed" });
    }

    return ok({ path, originalBytes, compressedBytes: out.length });
  } catch (err) {
    // Never fail loudly: this must not affect the upload path.
    console.error("backstop: unexpected error", err);
    return ok({ skipped: "unexpected error" });
  }
});
