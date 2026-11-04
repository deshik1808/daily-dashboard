-- supabase/migrations/0014_runtime_open_shift_and_retire_yellow.sql
-- 1. A shift can be saved with only the opening meter reading ("open"); runtime and
--    breakdown stay null until the closing reading is added.
-- 2. The yellow screen has left the site: new rows carry no yellow data. Existing
--    yellow data is kept untouched.
-- Loosening only: no data is changed or removed, and the previous app code keeps working.

alter table screen_runtime_logs
  alter column red_runtime_min drop not null,
  alter column red_breakdown_min drop not null,
  alter column red_breakdown_min drop default,
  alter column yellow_runtime_min drop not null,
  alter column yellow_breakdown_min drop not null,
  alter column yellow_breakdown_min drop default;

-- Opening and closing no longer have to come as a pair: a closing reading still needs
-- an opening one. meter_red_order / meter_yellow_order already pass when close is null.
alter table screen_meter_readings drop constraint if exists meter_red_pair;
alter table screen_meter_readings drop constraint if exists meter_yellow_pair;
alter table screen_meter_readings
  add constraint meter_red_close_needs_open check (red_close is null or red_open is not null),
  add constraint meter_yellow_close_needs_open check (yellow_close is null or yellow_open is not null);

notify pgrst, 'reload schema';
