-- supabase/migrations/0005_project_notes.sql
-- Add durable editable current_note and note_updated_at to phase_master
-- and expose them via phase_totals view.

alter table phase_master
  add column if not exists current_note text not null default '',
  add column if not exists note_updated_at timestamptz;

drop view if exists phase_totals;

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
  et.last_report_date,
  pm.current_note,
  pm.note_updated_at
from phase_master pm
left join entry_totals et on et.phase_agency_id = pm.id;
