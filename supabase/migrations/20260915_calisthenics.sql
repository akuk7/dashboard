-- Bodyweight/calisthenics workouts: a third measurement type. Unlike weight training (reps+weight)
-- and cardio (distance+time, single entry only), calisthenics logs multiple sets like weight
-- training, but each set has only ONE value - either reps or a held duration - chosen once per
-- workout at creation time (calisthenics_metric), not per set.

alter table workout_categories drop constraint if exists workout_categories_measurement_type_check;
alter table workout_categories add constraint workout_categories_measurement_type_check
  check (measurement_type in ('reps_weight', 'distance_time', 'calisthenics'));

insert into workout_categories (name, measurement_type) values
  ('Calisthenics', 'calisthenics')
on conflict (name) do nothing;

alter table workouts add column if not exists calisthenics_metric text
  check (calisthenics_metric in ('reps', 'time')); -- only set when category is Calisthenics

-- Calisthenics time-based PR (longest single hold). Reps-based calisthenics PR reuses the
-- existing pr_reps column (just a rep count, same as weight training's PR rep count).
alter table workouts add column if not exists pr_duration_seconds integer;
