-- Workout tracking: categories (seeded, 2 rows only), exercises with denormalized PRs, and a
-- flat set-log table. RLS follows the existing pattern in this app (no user_id column anywhere -
-- gated purely by "is someone logged in", same as todo_categories in
-- 20260821_habits_lending_todo_categories.sql).

-- =========================================================
-- 1. Workout categories - seeded, no add-UI, exactly 2 rows
-- =========================================================
create table if not exists workout_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  measurement_type text not null check (measurement_type in ('reps_weight', 'distance_time')),
  created_at timestamptz not null default now()
);

alter table workout_categories enable row level security;

create policy "Authenticated users can read workout_categories"
  on workout_categories for select
  to authenticated
  using (true);
-- No insert/update/delete policy - this table is never written to from the app.

insert into workout_categories (name, measurement_type) values
  ('Weight Training', 'reps_weight'),
  ('Cardio', 'distance_time')
on conflict (name) do nothing;

-- =========================================================
-- 2. Workouts (exercises), with denormalized PR columns
-- =========================================================
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references workout_categories(id) on delete restrict,
  body_parts text[] not null default '{}',
  target_muscle text, -- optional, more specific than body_parts; null for cardio

  -- Denormalized PR ("high score"), updated client-side after each save - never recomputed via a
  -- DB query/trigger. Weight-training PR = best single-set volume (weight * reps).
  pr_weight numeric,
  pr_reps integer,
  pr_value numeric, -- = pr_weight * pr_reps, the actual comparison metric
  -- Cardio PR = longest single-session distance.
  pr_distance numeric,
  pr_achieved_at date, -- shared by both PR kinds

  created_at timestamptz not null default now()
);

alter table workouts enable row level security;

create policy "Authenticated users can read workouts"
  on workouts for select to authenticated using (true);
create policy "Authenticated users can insert workouts"
  on workouts for insert to authenticated with check (true);
create policy "Authenticated users can update workouts"
  on workouts for update to authenticated using (true);
create policy "Authenticated users can delete workouts"
  on workouts for delete to authenticated using (true);

-- =========================================================
-- 3. Workout sets (flat log, one row per set)
-- =========================================================
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  log_date date not null, -- IST calendar date (todayIST()), never a timestamptz
  set_number integer not null, -- 1-based within (workout_id, log_date); always 1 for cardio

  -- Weight training: both set. Cardio: both null.
  reps integer,
  weight numeric,
  -- Cardio: both set. Weight training: both null.
  distance numeric,
  duration_seconds integer,

  created_at timestamptz not null default now()
);

alter table workout_sets enable row level security;

create policy "Authenticated users can read workout_sets"
  on workout_sets for select to authenticated using (true);
create policy "Authenticated users can insert workout_sets"
  on workout_sets for insert to authenticated with check (true);
create policy "Authenticated users can update workout_sets"
  on workout_sets for update to authenticated using (true);
create policy "Authenticated users can delete workout_sets"
  on workout_sets for delete to authenticated using (true);

create index if not exists workout_sets_workout_date_idx on workout_sets (workout_id, log_date);
