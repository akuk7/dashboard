-- Consolidated: creates muscle_groups (if it doesn't exist yet) and seeds it with the full
-- muscle group list directly. Safe to run on its own, regardless of whether the earlier
-- 20260822_muscle_groups.sql / 20260822_muscle_groups_full_list.sql were run.

create table if not exists muscle_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table muscle_groups enable row level security;

drop policy if exists "Authenticated users can read muscle_groups" on muscle_groups;
create policy "Authenticated users can read muscle_groups"
  on muscle_groups for select
  to authenticated
  using (true);

-- Clear out any partial/old seed data, then insert the full list fresh.
delete from muscle_groups;

insert into muscle_groups (name) values
  ('Chest'),
  ('Back'), ('Lats'), ('Traps'),
  ('Shoulder'),
  ('Biceps'), ('Triceps'), ('Forearm'),
  ('Core'), ('Obliques'),
  ('Quads'), ('Hamstring'), ('Calf'), ('Glutes');

-- Make sure workouts.target_muscle exists and points at nothing stale (this table depends on
-- workouts already having the target_muscle column - it must from 20260822_workouts_target_muscle.sql
-- having been run first; if that one is also missing, run it before this).
update workouts set target_muscle = '{}';
