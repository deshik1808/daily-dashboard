-- 0010_app_settings.sql
-- Store dynamic application settings editable by the authenticated Editor.

create table if not exists public.app_settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Dynamic key-value settings editable by the Editor.';

alter table public.app_settings enable row level security;

-- Anyone can read settings (needed for ReplyButton to fetch WhatsApp number)
create policy "app_settings: public read"
  on public.app_settings for select
  using (true);

-- Only authenticated users (Editor) can insert or update
create policy "app_settings: editor insert"
  on public.app_settings for insert
  to authenticated
  with check (true);

create policy "app_settings: editor update"
  on public.app_settings for update
  to authenticated
  using (true)
  with check (true);
