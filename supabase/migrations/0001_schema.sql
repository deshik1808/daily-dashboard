-- supabase/migrations/0001_schema.sql
create type phase_enum as enum ('I', 'II', 'III');
create type agency_enum as enum ('Zigma', 'Card Box');
create type phase_status_enum as enum ('Completed', 'In progress');
create type shift_enum as enum ('Day', 'Night', 'Full day');

create table phase_master (
  id uuid primary key default gen_random_uuid(),
  phase phase_enum not null,
  agency agency_enum not null,
  order_qty_mt numeric(12,2) not null,
  status phase_status_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase, agency)
);

create table bio_mining_entries (
  id uuid primary key default gen_random_uuid(),
  phase_agency_id uuid not null references phase_master(id),
  report_date date not null,
  shift shift_enum not null,
  inward_mt numeric(12,2) not null default 0,
  soil_mt numeric(12,2),
  rdf_mt numeric(12,2),
  stones_mt numeric(12,2),
  inert_mt numeric(12,2),
  steel_mt numeric(12,2),
  tyre_mt numeric(12,2),
  wood_mt numeric(12,2),
  glass_mt numeric(12,2),
  iron_scrap_mt numeric(12,2),
  wires_cables_mt numeric(12,2),
  others_mt numeric(12,2),
  remarks text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index bio_mining_entries_unique_report
  on bio_mining_entries (phase_agency_id, report_date, shift)
  where deleted_at is null;

create table mrf_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  note text not null default '',
  photo_paths text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index mrf_logs_unique_date
  on mrf_logs (log_date)
  where deleted_at is null;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger phase_master_set_updated_at before update on phase_master
  for each row execute function set_updated_at();
create trigger bio_mining_entries_set_updated_at before update on bio_mining_entries
  for each row execute function set_updated_at();
create trigger mrf_logs_set_updated_at before update on mrf_logs
  for each row execute function set_updated_at();
