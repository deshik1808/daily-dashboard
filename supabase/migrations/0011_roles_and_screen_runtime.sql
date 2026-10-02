-- supabase/migrations/0011_roles_and_screen_runtime.sql
-- Role helpers, screen_runtime_logs table with policies, and editor account tagging.

-- Role helpers
create or replace function public.app_role() returns text
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', '')
$$;

create or replace function public.app_agency() returns text
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'agency', '')
$$;

-- True when the phase belongs to the caller's agency.
create or replace function public.is_my_agency_phase(p_phase_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.phase_master pm
    where pm.id = p_phase_id and pm.agency::text = public.app_agency()
  )
$$;

-- Table screen_runtime_logs
create table if not exists screen_runtime_logs (
  id                        uuid primary key default gen_random_uuid(),
  phase_agency_id           uuid not null references phase_master(id),
  log_date                  date not null,
  shift                     shift_enum not null,
  red_runtime_min           integer not null,
  red_breakdown_min         integer not null default 0,
  red_breakdown_reasons     text,
  yellow_runtime_min        integer not null,
  yellow_breakdown_min      integer not null default 0,
  yellow_breakdown_reasons  text,
  created_by                uuid not null default auth.uid() references auth.users(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz,

  constraint screen_runtime_day_night check (shift in ('Day', 'Night')),
  constraint screen_runtime_red_minutes check (
    red_runtime_min >= 0 and red_breakdown_min >= 0
    and red_runtime_min + red_breakdown_min <= 720),
  constraint screen_runtime_yellow_minutes check (
    yellow_runtime_min >= 0 and yellow_breakdown_min >= 0
    and yellow_runtime_min + yellow_breakdown_min <= 720),
  constraint screen_runtime_red_reason check (
    red_breakdown_min = 0 or btrim(coalesce(red_breakdown_reasons, '')) <> ''),
  constraint screen_runtime_yellow_reason check (
    yellow_breakdown_min = 0 or btrim(coalesce(yellow_breakdown_reasons, '')) <> '')
);

create unique index if not exists screen_runtime_logs_unique_shift
  on screen_runtime_logs (phase_agency_id, log_date, shift)
  where deleted_at is null;

drop trigger if exists screen_runtime_logs_set_updated_at on screen_runtime_logs;
create trigger screen_runtime_logs_set_updated_at before update on screen_runtime_logs
  for each row execute function set_updated_at();

alter table screen_runtime_logs enable row level security;

drop policy if exists runtime_select on screen_runtime_logs;
create policy runtime_select on screen_runtime_logs for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
  or (public.app_role() = 'operator' and public.is_my_agency_phase(phase_agency_id))
);

drop policy if exists runtime_insert on screen_runtime_logs;
create policy runtime_insert on screen_runtime_logs for insert to authenticated with check (
  created_by = auth.uid() and (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and public.is_my_agency_phase(phase_agency_id))
  )
);

drop policy if exists runtime_update on screen_runtime_logs;
create policy runtime_update on screen_runtime_logs for update to authenticated
  using (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and created_by = auth.uid()
        and public.is_my_agency_phase(phase_agency_id))
  )
  with check (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and created_by = auth.uid()
        and public.is_my_agency_phase(phase_agency_id))
  );

-- Tag Deshik's account as editor
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"app_role":"editor"}'
where email = 'deshik1808@gmail.com' or id = '841e362e-739a-448a-b423-182f8da17762';
