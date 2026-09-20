-- 0009_short_links.sql
-- Cache for shortened URLs (is.gd) so the Reply button can include compact links.
-- Only the authenticated Editor can mint new rows; anonymous viewers can read.

create table if not exists public.short_links (
  path       text        primary key,
  short_url  text        not null,
  created_at timestamptz not null default now()
);

comment on table public.short_links is 'Cached is.gd short URLs keyed by canonical app path.';

-- RLS --
alter table public.short_links enable row level security;

-- Anyone can read cached short links.
create policy "short_links: public read"
  on public.short_links for select
  using (true);

-- Only authenticated users (Editor) can insert.
create policy "short_links: editor insert"
  on public.short_links for insert
  to authenticated
  with check (true);
