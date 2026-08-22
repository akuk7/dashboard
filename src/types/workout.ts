export type MeasurementType = 'reps_weight' | 'distance_time'

export interface WorkoutCategory {
  id: string
  name: string
  measurement_type: MeasurementType
  created_at: string
}

export interface MuscleGroup {
  id: string
  name: string
  created_at: string
}

export interface Workout {
  id: string
  name: string
  category_id: string
  target_muscle: string[] // muscle_groups.id values - empty for cardio
  // Denormalized PR ("high score") - see src/lib/workouts.ts for how these are maintained.
  pr_weight: number | null
  pr_reps: number | null
  pr_value: number | null // = pr_weight * pr_reps
  pr_distance: number | null
  pr_achieved_at: string | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  workout_id: string
  log_date: string // YYYY-MM-DD, IST
  set_number: number // always 1 for cardio
  reps: number | null
  weight: number | null
  distance: number | null
  duration_seconds: number | null
  created_at: string
}

// A (workout_id, log_date) session, built client-side by grouping flat WorkoutSet rows.
export interface WorkoutSession {
  key: string // `${workout_id}|${log_date}`
  workout_id: string
  log_date: string
  sets: WorkoutSet[]
}
