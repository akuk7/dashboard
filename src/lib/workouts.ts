import type { Workout, WorkoutCategory, WorkoutSet, WorkoutSession } from '../types/workout'

export function sessionKey(workoutId: string, logDate: string): string {
  return `${workoutId}|${logDate}`
}

// Groups flat workout_sets rows into (workout_id, log_date) sessions. Sets within a session are
// ordered by set_number; sessions are ordered newest-first.
export function groupIntoSessions(sets: WorkoutSet[]): WorkoutSession[] {
  const byKey = new Map<string, WorkoutSet[]>()

  sets.forEach((s) => {
    const key = sessionKey(s.workout_id, s.log_date)
    const bucket = byKey.get(key)
    if (bucket) bucket.push(s)
    else byKey.set(key, [s])
  })

  const sessions: WorkoutSession[] = Array.from(byKey.entries()).map(([key, sessionSets]) => {
    const [workout_id, log_date] = key.split('|')
    return {
      key,
      workout_id,
      log_date,
      sets: [...sessionSets].sort((a, b) => a.set_number - b.set_number),
    }
  })

  sessions.sort((a, b) => {
    if (a.log_date !== b.log_date) return a.log_date < b.log_date ? 1 : -1
    return a.workout_id < b.workout_id ? -1 : a.workout_id > b.workout_id ? 1 : 0
  })

  return sessions
}

// Input rows for a save (either shape depending on the workout's category - unused fields are
// simply absent, not read).
export type PRCandidateRow = { reps?: number | null; weight?: number | null; distance?: number | null }

// Single source of truth for the PR rule, shared by desktop and mobile so it can never drift:
// - reps_weight: PR = best single-set volume (weight * reps).
// - distance_time: PR = longest single-session distance.
// Returns a patch to apply to the workout row if a new PR was set, or null if not beaten.
// This is a "high score" comparison against the workout's currently stored PR - it never rescans
// history, and it never downgrades a PR if the record-setting set is later edited/deleted.
export function checkAndBuildPRUpdate(
  workout: Workout,
  category: WorkoutCategory,
  rows: PRCandidateRow[],
  logDate: string
): Partial<Workout> | null {
  if (category.measurement_type === 'reps_weight') {
    const candidates = rows
      .filter((r) => r.weight != null && r.reps != null)
      .map((r) => ({ weight: r.weight as number, reps: r.reps as number, value: (r.weight as number) * (r.reps as number) }))

    if (candidates.length === 0) return null
    const best = candidates.reduce((a, b) => (b.value > a.value ? b : a))

    if (workout.pr_value != null && best.value <= workout.pr_value) return null
    return {
      pr_weight: best.weight,
      pr_reps: best.reps,
      pr_value: best.value,
      pr_achieved_at: logDate,
    }
  }

  // distance_time: cardio has no "sets" concept - there's exactly one row, but take the max
  // defensively in case that ever changes.
  const distances = rows.map((r) => r.distance).filter((d): d is number => d != null)
  const bestDistance = distances.length > 0 ? Math.max(...distances) : null
  if (bestDistance == null) return null
  if (workout.pr_distance != null && bestDistance <= workout.pr_distance) return null
  return {
    pr_distance: bestDistance,
    pr_achieved_at: logDate,
  }
}
