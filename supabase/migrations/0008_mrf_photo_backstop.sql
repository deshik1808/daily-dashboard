-- supabase/migrations/0008_mrf_photo_backstop.sql
-- Wires the server-side compression backstop (design spec S6.3): on every
-- insert into the mrf-photos bucket, asynchronously invoke the
-- compress-mrf-photo Edge Function, which re-compresses anything still over
-- 250 KB (e.g. a HEIC the browser could not decode).
--
-- ACTIVATION (two manual steps, both needed before this does anything):
--   1. Edge Function secret:
--      Dashboard > Edge Functions > compress-mrf-photo > Secrets
--      add COMPRESS_HOOK_SECRET = <a long random string>
--   2. Same value into Vault so the trigger can send it:
--      select vault.create_secret('<same random string>', 'compress_hook_secret');
--
-- Until both are set the trigger deliberately no-ops, so applying this
-- migration early is harmless and can never break an upload.

create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_mrf_photo_backstop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook_secret text;
begin
  if new.bucket_id is distinct from 'mrf-photos' then
    return new;
  end if;

  select decrypted_secret into hook_secret
  from vault.decrypted_secrets
  where name = 'compress_hook_secret'
  limit 1;

  -- Not configured yet: skip silently rather than erroring inside the upload.
  if hook_secret is null then
    return new;
  end if;

  -- pg_net queues this; it does not block the insert.
  perform extensions.net_http_post(
    url := 'https://yycyaqubrjehqpikaaeo.supabase.co/functions/v1/compress-mrf-photo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-compress-hook-secret', hook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object('bucket_id', new.bucket_id, 'name', new.name)
    )
  );

  return new;
exception
  when others then
    -- The backstop must never take down an upload.
    raise warning 'mrf photo backstop could not be queued: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists mrf_photos_compress_backstop on storage.objects;
create trigger mrf_photos_compress_backstop
  after insert on storage.objects
  for each row
  execute function public.invoke_mrf_photo_backstop();
