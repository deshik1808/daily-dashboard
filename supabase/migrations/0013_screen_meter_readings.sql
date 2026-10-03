-- supabase/migrations/0013_screen_meter_readings.sql
-- Raw opening/closing hour-meter readings behind a screen runtime log, kept for audit.
-- Additive only: new table, no change to existing tables or policies.
-- Visible to editor and operator (own agency) only. Viewers and anon get no policy, so no rows.

create table if not exists screen_meter_readings (
  runtime_log_id  uuid primary key references screen_runtime_logs(id),
  red_open        numeric(10,2),
  red_close       numeric(10,2),
  yellow_open     numeric(10,2),
  yellow_close    numeric(10,2),
  created_by      uuid not null default auth.uid() references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint meter_red_pair check ((red_open is null) = (red_close is null)),
  constraint meter_yellow_pair check ((yellow_open is null) = (yellow_close is null)),
  constraint meter_red_order check (red_open is null or red_close >= red_open),
  constraint meter_yellow_order check (yellow_open is null or yellow_close >= yellow_open)
);

drop trigger if exists screen_meter_readings_set_updated_at on screen_meter_readings;
create trigger screen_meter_readings_set_updated_at before update on screen_meter_readings
  for each row execute function set_updated_at();

alter table screen_meter_readings enable row level security;

-- Operator access follows the parent log: same agency, and (for writes) their own log.
drop policy if exists meter_select on screen_meter_readings;
create policy meter_select on screen_meter_readings for select to authenticated using (
  public.app_role() = 'editor'
  or (public.app_role() = 'operator' and exists (
    select 1 from public.screen_runtime_logs l
    where l.id = runtime_log_id and public.is_my_agency_phase(l.phase_agency_id)
  ))
);

drop policy if exists meter_insert on screen_meter_readings;
create policy meter_insert on screen_meter_readings for insert to authenticated with check (
  created_by = auth.uid() and (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and exists (
      select 1 from public.screen_runtime_logs l
      where l.id = runtime_log_id and l.created_by = auth.uid()
        and public.is_my_agency_phase(l.phase_agency_id)
    ))
  )
);

drop policy if exists meter_update on screen_meter_readings;
create policy meter_update on screen_meter_readings for update to authenticated
  using (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and exists (
      select 1 from public.screen_runtime_logs l
      where l.id = runtime_log_id and l.created_by = auth.uid()
        and public.is_my_agency_phase(l.phase_agency_id)
    ))
  )
  with check (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and exists (
      select 1 from public.screen_runtime_logs l
      where l.id = runtime_log_id and l.created_by = auth.uid()
        and public.is_my_agency_phase(l.phase_agency_id)
    ))
  );
