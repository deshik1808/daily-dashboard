-- supabase/migrations/0004_hardening.sql
-- Whole-branch review hardening: security-invoker views, created_by attribution,
-- fixed search_path on set_updated_at(), and non-negative/cardinality guards.

-- Finding 1: recreate views with security_invoker = on so RLS on the
-- underlying tables is respected for callers, not the view owner's privileges.
drop view if exists phase_totals;
drop view if exists phase_material_breakdown;

create view phase_totals with (security_invoker = on) as
with entry_totals as (
  select
    phase_agency_id,
    sum(inward_mt) as inward_mt,
    sum(
      coalesce(soil_mt,0) + coalesce(rdf_mt,0) + coalesce(stones_mt,0) +
      coalesce(inert_mt,0) + coalesce(steel_mt,0) + coalesce(tyre_mt,0) +
      coalesce(wood_mt,0) + coalesce(glass_mt,0) + coalesce(iron_scrap_mt,0) +
      coalesce(wires_cables_mt,0) + coalesce(others_mt,0)
    ) as disposed_mt,
    max(report_date) as last_report_date
  from bio_mining_entries
  where deleted_at is null
  group by phase_agency_id
)
select
  pm.id as phase_agency_id,
  pm.phase,
  pm.agency,
  pm.order_qty_mt,
  pm.status,
  coalesce(et.inward_mt, 0)::numeric(12,2) as cumulative_inward_mt,
  coalesce(et.disposed_mt, 0)::numeric(12,2) as cumulative_disposed_mt,
  (coalesce(et.inward_mt, 0) - coalesce(et.disposed_mt, 0))::numeric(12,2) as balance_mt,
  case when pm.order_qty_mt = 0 then 0
    else round(coalesce(et.inward_mt, 0) / pm.order_qty_mt * 100, 2)
  end as pct_of_order,
  et.last_report_date
from phase_master pm
left join entry_totals et on et.phase_agency_id = pm.id;

create view phase_material_breakdown with (security_invoker = on) as
with materials as (
  select phase_agency_id, 'Soil' as material, coalesce(soil_mt,0) as qty_mt from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'RDF', coalesce(rdf_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Stones', coalesce(stones_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Inert', coalesce(inert_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Steel', coalesce(steel_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Tyre', coalesce(tyre_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Wood', coalesce(wood_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Glass', coalesce(glass_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Iron scrap', coalesce(iron_scrap_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Wires & cables', coalesce(wires_cables_mt,0) from bio_mining_entries where deleted_at is null
  union all select phase_agency_id, 'Others', coalesce(others_mt,0) from bio_mining_entries where deleted_at is null
),
totals as (
  select phase_agency_id, sum(qty_mt) as disposed_total from materials group by phase_agency_id
)
select
  m.phase_agency_id,
  m.material,
  sum(m.qty_mt)::numeric(12,2) as disposed_mt,
  case when t.disposed_total = 0 then 0
    else round(sum(m.qty_mt) / t.disposed_total * 100, 2)
  end as share_pct
from materials m
join totals t on t.phase_agency_id = m.phase_agency_id
group by m.phase_agency_id, m.material, t.disposed_total;

-- Finding 2: enforce created_by attribution at insert time (single-editor system,
-- so attribution rather than per-row ownership restriction is sufficient).
alter table bio_mining_entries alter column created_by set default auth.uid();
alter table bio_mining_entries alter column created_by set not null;
drop policy entries_insert on bio_mining_entries;
create policy entries_insert on bio_mining_entries
  for insert to authenticated with check (created_by = auth.uid());

alter table mrf_logs alter column created_by set default auth.uid();
alter table mrf_logs alter column created_by set not null;
drop policy mrf_logs_insert on mrf_logs;
create policy mrf_logs_insert on mrf_logs
  for insert to authenticated with check (created_by = auth.uid());

-- Finding 3: pin search_path on set_updated_at() to close the mutable-search-path warning.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Finding 5: simple row-local guards (no subqueries allowed in CHECK constraints).
alter table bio_mining_entries add constraint entries_mt_non_negative check (
  inward_mt >= 0 and
  coalesce(soil_mt,0) >= 0 and coalesce(rdf_mt,0) >= 0 and coalesce(stones_mt,0) >= 0 and
  coalesce(inert_mt,0) >= 0 and coalesce(steel_mt,0) >= 0 and coalesce(tyre_mt,0) >= 0 and
  coalesce(wood_mt,0) >= 0 and coalesce(glass_mt,0) >= 0 and coalesce(iron_scrap_mt,0) >= 0 and
  coalesce(wires_cables_mt,0) >= 0 and coalesce(others_mt,0) >= 0
);
alter table mrf_logs add constraint mrf_logs_photo_count check (
  array_length(photo_paths, 1) is null or (array_length(photo_paths, 1) between 1 and 10)
);
