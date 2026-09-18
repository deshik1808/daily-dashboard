-- supabase/migrations/0002_rls.sql
alter table phase_master enable row level security;
alter table bio_mining_entries enable row level security;
alter table mrf_logs enable row level security;

create policy phase_master_select on phase_master for select using (true);
create policy phase_master_insert on phase_master for insert to authenticated with check (true);
create policy phase_master_update on phase_master for update to authenticated using (true) with check (true);

create policy entries_select on bio_mining_entries for select using (true);
create policy entries_insert on bio_mining_entries for insert to authenticated with check (true);
create policy entries_update on bio_mining_entries for update to authenticated using (true) with check (true);

create policy mrf_logs_select on mrf_logs for select using (true);
create policy mrf_logs_insert on mrf_logs for insert to authenticated with check (true);
create policy mrf_logs_update on mrf_logs for update to authenticated using (true) with check (true);
