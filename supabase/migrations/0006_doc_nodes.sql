-- supabase/migrations/0006_doc_nodes.sql

create type doc_node_kind as enum ('folder', 'link');

create table doc_nodes (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references doc_nodes(id) on delete cascade,
  kind        doc_node_kind not null,
  title       text not null,
  url         text,
  created_by  uuid not null default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint doc_nodes_title_length
    check (char_length(btrim(title)) between 1 and 120),
  constraint doc_nodes_url_shape
    check (
      (kind = 'folder' and url is null) or
      (kind = 'link'   and url ~ '^https://')
    )
);

create unique index doc_nodes_unique_name_in_parent
  on doc_nodes (parent_id, lower(btrim(title)))
  nulls not distinct;

create trigger doc_nodes_set_updated_at before update on doc_nodes
  for each row execute function set_updated_at();

alter table doc_nodes enable row level security;

create policy doc_nodes_select on doc_nodes
  for select using (true);
create policy doc_nodes_insert on doc_nodes
  for insert to authenticated with check (created_by = auth.uid());
create policy doc_nodes_update on doc_nodes
  for update to authenticated using (true) with check (true);
create policy doc_nodes_delete on doc_nodes
  for delete to authenticated using (true);
