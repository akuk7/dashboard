import { useEffect, useMemo, useState } from 'react'
import { PlusCircle, List, SlidersHorizontal, Edit, Trash2, Star } from 'lucide-react'
import supabase from '../../lib/supabase'
import type { MuscleGroup, Workout, WorkoutCategory, WorkoutSet, WorkoutSession } from '../../types/workout'
import { groupIntoSessions, sessionKey } from '../../lib/workouts'
import WorkoutModel from '../../models/WorkoutModel'
import ViewWorkoutsModel from '../../models/ViewWorkoutsModel'
import LogWorkoutModel from '../../models/LogWorkoutModel'
import type { LogWorkoutSaveResult } from '../../models/LogWorkoutModel'
import MobileHeader from '../MobileHeader'
import { formatDisplayIST, startOfMonthIST } from '../../lib/dateUtils'

type ModalState =
  | { mode: 'closed' }
  | { mode: 'log'; initialWorkoutId?: string; initialLogDate?: string }
  | { mode: 'addWorkout' }
  | { mode: 'editWorkout'; workout: Workout }
  | { mode: 'viewWorkouts' }

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

const MobileWorkouts: React.FC = () => {
  const [categories, setCategories] = useState<WorkoutCategory[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [modalState, setModalState] = useState<ModalState>({ mode: 'closed' })
  const [showFilters, setShowFilters] = useState(false)

  const [targetMuscleFilter, setTargetMuscleFilter] = useState('all')
  const [workoutFilter, setWorkoutFilter] = useState('all')
  const [fromDate, setFromDate] = useState(startOfMonthIST())
  const [toDate, setToDate] = useState('')

  const loadData = async () => {
    const [{ data: catData }, { data: muscleData }, { data: workoutData }, { data: setData }] = await Promise.all([
      supabase.from('workout_categories').select('*').order('created_at', { ascending: true }),
      supabase.from('muscle_groups').select('*').order('name', { ascending: true }),
      supabase.from('workouts').select('*').order('created_at', { ascending: true }),
      supabase.from('workout_sets').select('*').order('log_date', { ascending: false }).order('set_number', { ascending: true }),
    ])
    setCategories((catData as WorkoutCategory[]) || [])
    setMuscleGroups((muscleData as MuscleGroup[]) || [])
    setWorkouts((workoutData as Workout[]) || [])
    setWorkoutSets((setData as WorkoutSet[]) || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const sessions = useMemo(() => groupIntoSessions(workoutSets), [workoutSets])

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

  const hasSets = (workoutId: string) => workoutSets.some((s) => s.workout_id === workoutId)

  const handleWorkoutSaved = (workout: Workout) => {
    setWorkouts((prev) => {
      const exists = prev.some((w) => w.id === workout.id)
      return exists ? prev.map((w) => (w.id === workout.id ? workout : w)) : [...prev, workout]
    })
  }

  const handleDeleteWorkout = async (id: string) => {
    const { error } = await supabase.from('workouts').delete().match({ id })
    if (error) {
      console.error('Error deleting workout:', error)
      return
    }
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    setWorkoutSets((prev) => prev.filter((s) => s.workout_id !== id))
  }

  const handleSetsLogged = (result: LogWorkoutSaveResult) => {
    setWorkoutSets((prev) => [
      ...prev.filter((s) => sessionKey(s.workout_id, s.log_date) !== result.key),
      ...result.sets,
    ])
    if (result.updatedWorkout) {
      const updated = result.updatedWorkout
      setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
    }
  }

  const handleDeleteSession = async (session: WorkoutSession) => {
    if (!window.confirm('Delete this logged session?')) return
    const { error } = await supabase.from('workout_sets').delete().in('id', session.sets.map((s) => s.id))
    if (error) {
      console.error('Error deleting session:', error)
      return
    }
    setWorkoutSets((prev) => prev.filter((s) => !session.sets.some((removed) => removed.id === s.id)))
  }

  return (
    <div className="w-full pb-24">
      <MobileHeader
        title="Workouts"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalState({ mode: 'viewWorkouts' })}
              className="p-2 rounded-lg bg-[#121212] text-gray-300 border border-[#303030]"
              title="View Workouts"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModalState({ mode: 'addWorkout' })}
              className="px-3 py-2 rounded-lg bg-[#121212] text-gray-300 border border-[#303030] text-sm"
            >
              + Workout
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 mb-3 text-sm text-gray-300 border border-[#303030] rounded-lg px-3 py-2 bg-[#121212]"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters {showFilters ? '▲' : '▼'}
        </button>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <select
              value={targetMuscleFilter}
              onChange={(e) => setTargetMuscleFilter(e.target.value)}
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
            >
              <option value="all">All Target Muscles</option>
              {muscleGroups.map((muscle) => <option key={muscle.id} value={muscle.id}>{muscle.name}</option>)}
            </select>
            <select
              value={workoutFilter}
              onChange={(e) => setWorkoutFilter(e.target.value)}
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
            >
              <option value="all">All Workouts</option>
              {narrowedWorkouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((session) => {
            const workout = workoutsById[session.workout_id]
            const category = workout ? categoriesById[workout.category_id] : undefined
            const isPR = isPRSession(session, workout, category)

            return (
              <div key={session.key} className="p-3 bg-[#121212] rounded-lg border border-[#303030]">
                <div className="flex items-start justify-between gap-2">
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
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => setModalState({ mode: 'log', initialWorkoutId: session.workout_id, initialLogDate: session.log_date })}
                      className="text-gray-500 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteSession(session)} className="text-gray-500 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-gray-500 text-center mt-10">No workouts logged yet.</p>}
        </div>
      </div>

      <button
        onClick={() => setModalState({ mode: 'log' })}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {modalState.mode === 'log' && (
        <LogWorkoutModel
          workouts={workouts}
          categories={categories}
          muscleGroups={muscleGroups}
          sessions={sessions}
          initialWorkoutId={modalState.initialWorkoutId}
          initialLogDate={modalState.initialLogDate}
          onClose={() => setModalState({ mode: 'closed' })}
          onSaved={handleSetsLogged}
        />
      )}

      {(modalState.mode === 'addWorkout' || modalState.mode === 'editWorkout') && (
        <WorkoutModel
          workout={modalState.mode === 'editWorkout' ? modalState.workout : null}
          categories={categories}
          muscleGroups={muscleGroups}
          hasSets={modalState.mode === 'editWorkout' ? hasSets(modalState.workout.id) : false}
          onClose={() => setModalState({ mode: 'closed' })}
          onSave={handleWorkoutSaved}
        />
      )}

      {modalState.mode === 'viewWorkouts' && (
        <ViewWorkoutsModel
          workouts={workouts}
          categories={categories}
          muscleGroups={muscleGroups}
          onClose={() => setModalState({ mode: 'closed' })}
          onEdit={(workout) => setModalState({ mode: 'editWorkout', workout })}
          onDelete={handleDeleteWorkout}
        />
      )}
    </div>
  )
}

export default MobileWorkouts
