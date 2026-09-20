-- supabase/migrations/0007_mrf_photos.sql
-- MRF logs: photos and notes are both mandatory.
-- Creates the storage bucket that photo_paths points into, and tightens the
-- mrf_logs guards so a log cannot exist without at least one photo and a note.

-- PRIVATE bucket (design spec S6.4): there is no public object URL. Both Viewer
-- and Editor fetch photos through short-lived signed URLs minted server-side.
-- The size limit is headroom for the Edge Function backstop, not the target:
-- the client compresses to <= 250 KB before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mrf-photos',
  'mrf-photos',
  false,
  10485760, -- 10 MB ceiling; compressed photos land around 250 KB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS.
-- select stays open so the server can mint a signed URL on behalf of an
-- anonymous Viewer; because the bucket is private, that signed URL is still the
-- only way to actually fetch the bytes.
drop policy if exists mrf_photos_select on storage.objects;
create policy mrf_photos_select on storage.objects
  for select using (bucket_id = 'mrf-photos');

-- Writes are gated on `authenticated` (single-editor system, same reasoning as
-- 0004_hardening.sql).
drop policy if exists mrf_photos_insert on storage.objects;
create policy mrf_photos_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'mrf-photos');

drop policy if exists mrf_photos_update on storage.objects;
create policy mrf_photos_update on storage.objects
  for update to authenticated using (bucket_id = 'mrf-photos')
  with check (bucket_id = 'mrf-photos');

drop policy if exists mrf_photos_delete on storage.objects;
create policy mrf_photos_delete on storage.objects
  for delete to authenticated using (bucket_id = 'mrf-photos');

-- Photos are mandatory: between 1 and 10 per log (was: optional, 1..10 if present).
alter table mrf_logs drop constraint if exists mrf_logs_photo_count;
alter table mrf_logs add constraint mrf_logs_photo_count check (
  array_length(photo_paths, 1) between 1 and 10
);

-- Notes are mandatory: reject blank / whitespace-only. The column default of ''
-- is dropped so an insert that omits the note fails loudly instead of silently
-- storing an empty string.
alter table mrf_logs alter column note drop default;
alter table mrf_logs drop constraint if exists mrf_logs_note_not_blank;
alter table mrf_logs add constraint mrf_logs_note_not_blank check (btrim(note) <> '');
