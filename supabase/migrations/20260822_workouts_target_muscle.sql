-- body_parts and target_muscle represented the same concept twice (a set of muscles worked).
-- Drop the free-text single-value target_muscle and rename body_parts to target_muscle, keeping
-- it as the array column. For cardio workouts, this stays an empty array (no target muscle).
alter table workouts drop column if exists target_muscle;
alter table workouts rename column body_parts to target_muscle;
