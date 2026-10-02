-- supabase/migrations/0012_private_dashboard.sql
-- Role-based RLS on every existing table and mrf-photos bucket. Anon and open policies dropped.

-- 1. phase_master
drop policy if exists phase_master_select on phase_master;
drop policy if exists phase_master_insert on phase_master;
drop policy if exists phase_master_update on phase_master;

create policy phase_master_select on phase_master for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
  or (public.app_role() = 'operator' and agency::text = public.app_agency())
);

create policy phase_master_insert on phase_master for insert to authenticated with check (
  public.app_role() = 'editor'
);

create policy phase_master_update on phase_master for update to authenticated
  using (public.app_role() = 'editor')
  with check (public.app_role() = 'editor');

-- 2. bio_mining_entries
drop policy if exists entries_select on bio_mining_entries;
drop policy if exists entries_insert on bio_mining_entries;
drop policy if exists entries_update on bio_mining_entries;

create policy entries_select on bio_mining_entries for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
  or (public.app_role() = 'operator' and public.is_my_agency_phase(phase_agency_id))
);

create policy entries_insert on bio_mining_entries for insert to authenticated with check (
  created_by = auth.uid() and (
    public.app_role() = 'editor'
    or (public.app_role() = 'operator' and public.is_my_agency_phase(phase_agency_id))
  )
);

create policy entries_update on bio_mining_entries for update to authenticated
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

-- 3. mrf_logs
drop policy if exists mrf_logs_select on mrf_logs;
drop policy if exists mrf_logs_insert on mrf_logs;
drop policy if exists mrf_logs_update on mrf_logs;

create policy mrf_logs_select on mrf_logs for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
);

create policy mrf_logs_insert on mrf_logs for insert to authenticated with check (
  created_by = auth.uid() and public.app_role() = 'editor'
);

create policy mrf_logs_update on mrf_logs for update to authenticated
  using (public.app_role() = 'editor')
  with check (public.app_role() = 'editor');

-- 4. doc_nodes
drop policy if exists doc_nodes_select on doc_nodes;
drop policy if exists doc_nodes_insert on doc_nodes;
drop policy if exists doc_nodes_update on doc_nodes;
drop policy if exists doc_nodes_delete on doc_nodes;

create policy doc_nodes_select on doc_nodes for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
);

create policy doc_nodes_insert on doc_nodes for insert to authenticated with check (
  created_by = auth.uid() and public.app_role() = 'editor'
);

create policy doc_nodes_update on doc_nodes for update to authenticated
  using (public.app_role() = 'editor')
  with check (public.app_role() = 'editor');

create policy doc_nodes_delete on doc_nodes for delete to authenticated
  using (public.app_role() = 'editor');

-- 5. app_settings
drop policy if exists "app_settings: public read" on app_settings;
drop policy if exists "app_settings: editor insert" on app_settings;
drop policy if exists "app_settings: editor update" on app_settings;

create policy "app_settings: role read" on app_settings for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
);

create policy "app_settings: editor insert" on app_settings for insert to authenticated with check (
  public.app_role() = 'editor'
);

create policy "app_settings: editor update" on app_settings for update to authenticated
  using (public.app_role() = 'editor')
  with check (public.app_role() = 'editor');

-- 6. short_links
drop policy if exists "short_links: public read" on short_links;
drop policy if exists "short_links: editor insert" on short_links;

create policy "short_links: role read" on short_links for select to authenticated using (
  public.app_role() in ('editor', 'viewer')
);

create policy "short_links: editor insert" on short_links for insert to authenticated with check (
  public.app_role() = 'editor'
);

-- 7. push_subscriptions
drop policy if exists "push_sub_insert" on push_subscriptions;
drop policy if exists "push_sub_delete" on push_subscriptions;
drop policy if exists "push_sub_update" on push_subscriptions;
drop policy if exists "push_sub_select" on push_subscriptions;

-- 8. storage.objects for mrf-photos
drop policy if exists mrf_photos_select on storage.objects;
drop policy if exists mrf_photos_insert on storage.objects;
drop policy if exists mrf_photos_update on storage.objects;
drop policy if exists mrf_photos_delete on storage.objects;

create policy mrf_photos_select on storage.objects for select to authenticated using (
  bucket_id = 'mrf-photos' and public.app_role() = 'editor'
);

create policy mrf_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'mrf-photos' and public.app_role() = 'editor'
);

create policy mrf_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'mrf-photos' and public.app_role() = 'editor')
  with check (bucket_id = 'mrf-photos' and public.app_role() = 'editor');

create policy mrf_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'mrf-photos' and public.app_role() = 'editor');
