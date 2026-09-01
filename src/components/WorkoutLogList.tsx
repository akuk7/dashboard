import React, { useEffect, useMemo, useState } from 'react'
import { Edit, Trash2, Star } from 'lucide-react'
import type { MuscleGroup, Workout, WorkoutCategory, WorkoutSession } from '../types/workout'
import { formatDisplayIST, startOfMonthIST } from '../lib/dateUtils'

type Props = {
  sessions: WorkoutSession[]
  workouts: Workout[]
  categories: WorkoutCategory[]
  muscleGroups: MuscleGroup[]
  onEditSession: (session: WorkoutSession) => void
  onDeleteSession: (session: WorkoutSession) => void
}

const summarizeSession = (session: WorkoutSession, category: WorkoutCategory | undefined): string => {
  if (!category) return ''
  if (category.measurement_type === 'reps_weight') {
    return session.sets.map((s) => `${s.weight}kg×${s.reps}`).join(' · ')
  }
  const set = session.sets[0]
  if (!set) return ''
  const total = set.duration_seconds ?? 0
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${set.distance}km in ${mins}:${String(secs).padStart(2, '0')}`
}

const isPRSession = (session: WorkoutSession, workout: Workout | undefined, category: WorkoutCategory | undefined): boolean => {
  if (!workout || !category || workout.pr_achieved_at !== session.log_date) return false
  if (category.measurement_type === 'reps_weight') {
    return session.sets.some((s) => s.weight === workout.pr_weight && s.reps === workout.pr_reps)
  }
  return session.sets.some((s) => s.distance === workout.pr_distance)
}

const WorkoutLogList: React.FC<Props> = ({ sessions, workouts, categories, muscleGroups, onEditSession, onDeleteSession }) => {
  const [targetMuscleFilter, setTargetMuscleFilter] = useState('all')
  const [workoutFilter, setWorkoutFilter] = useState('all')
  const [fromDate, setFromDate] = useState(startOfMonthIST())
  const [toDate, setToDate] = useState('')

  const workoutsById = useMemo(() => {
    const map: Record<string, Workout> = {}
    workouts.forEach((w) => { map[w.id] = w })
    return map
  }, [workouts])

  const categoriesById = useMemo(() => {
    const map: Record<string, WorkoutCategory> = {}
    categories.forEach((c) => { map[c.id] = c })
    return map
  }, [categories])

  // One filter narrows the options of another - no existing precedent in this app, built fresh.
  const narrowedWorkouts = useMemo(
    () => (targetMuscleFilter === 'all' ? workouts : workouts.filter((w) => w.target_muscle.includes(targetMuscleFilter))),
    [workouts, targetMuscleFilter]
  )

  useEffect(() => {
    if (workoutFilter !== 'all' && !narrowedWorkouts.some((w) => w.id === workoutFilter)) {
      setWorkoutFilter('all')
    }
  }, [narrowedWorkouts, workoutFilter])

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const workout = workoutsById[s.workout_id]
      if (targetMuscleFilter !== 'all' && !workout?.target_muscle.includes(targetMuscleFilter)) return false
      if (workoutFilter !== 'all' && s.workout_id !== workoutFilter) return false
      if (fromDate && s.log_date < fromDate) return false
      if (toDate && s.log_date > toDate) return false
      return true
    })
  }, [sessions, workoutsById, targetMuscleFilter, workoutFilter, fromDate, toDate])

  return (
    <div className="p-6 border border-[#303030] shadow-md rounded-xl text-gray-100 mt-6">
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-[#303030] pb-3 gap-3">
        <h4 className="text-xl font-bold text-white">History ({filtered.length})</h4>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={targetMuscleFilter}
            onChange={(e) => setTargetMuscleFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300"
          >
            <option value="all">All Target Muscles</option>
            {muscleGroups.map((muscle) => <option key={muscle.id} value={muscle.id}>{muscle.name}</option>)}
          </select>

          <select
            value={workoutFilter}
            onChange={(e) => setWorkoutFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300"
          >
            <option value="all">All Workouts</option>
            {narrowedWorkouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-sm text-gray-300"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-sm text-gray-300"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
        {filtered.map((session) => {
          const workout = workoutsById[session.workout_id]
          const category = workout ? categoriesById[workout.category_id] : undefined
          const isPR = isPRSession(session, workout, category)

          return (
            <div key={session.key} className="flex items-center justify-between p-3 bg-[#121212] rounded-lg border border-[#303030] transition">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{workout?.name ?? 'Unknown'}</p>
                  {isPR && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" /> PR
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDisplayIST(session.log_date)} &middot; {summarizeSession(session, category)}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  onClick={() => onEditSession(session)}
                  className="text-gray-600 hover:text-white p-1 rounded-full transition"
                  title="Edit session"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteSession(session)}
                  className="text-gray-600 hover:text-red-500 p-1 rounded-full transition"
                  title="Delete session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-gray-400 mt-2">No workouts logged yet.</p>
        )}
      </div>
    </div>
  )
}

export default WorkoutLogList
