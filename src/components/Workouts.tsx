import { useEffect, useMemo, useState } from 'react'
import { Dumbbell, PlusCircle, List } from 'lucide-react'
import supabase from '../lib/supabase'
import type { MuscleGroup, Workout, WorkoutCategory, WorkoutSet, WorkoutSession } from '../types/workout'
import { groupIntoSessions, sessionKey } from '../lib/workouts'
import WorkoutModel from '../models/WorkoutModel'
import ViewWorkoutsModel from '../models/ViewWorkoutsModel'
import LogWorkoutModel from '../models/LogWorkoutModel'
import type { LogWorkoutSaveResult } from '../models/LogWorkoutModel'
import WorkoutLogList from './WorkoutLogList'

type ModalState =
  | { mode: 'closed' }
  | { mode: 'log'; initialWorkoutId?: string; initialLogDate?: string }
  | { mode: 'addWorkout' }
  | { mode: 'editWorkout'; workout: Workout }
  | { mode: 'viewWorkouts' }

const Workouts: React.FC = () => {
  const [categories, setCategories] = useState<WorkoutCategory[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [modalState, setModalState] = useState<ModalState>({ mode: 'closed' })

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

  const setHasSets = useMemo(() => {
    const ids = new Set(workoutSets.map((s) => s.workout_id))
    return (workoutId: string) => ids.has(workoutId)
  }, [workoutSets])

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
    setWorkoutSets((prev) => prev.filter((s) => s.workout_id !== id)) // cascaded server-side too
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
    <div className="w-[85vw] mt-10">
      <div className="flex justify-between items-center mb-4 border-b border-[#303030] pb-2">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2" id="workouts">
          <Dumbbell className="w-5 h-5 text-gray-400" /> Workouts
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalState({ mode: 'viewWorkouts' })}
            className="px-3 py-2 rounded-lg bg-[#121212] text-gray-300 hover:bg-[#303030] transition border border-[#303030] text-sm flex items-center gap-2"
          >
            <List size={16} /> View Workouts
          </button>
          <button
            onClick={() => setModalState({ mode: 'addWorkout' })}
            className="px-3 py-2 rounded-lg bg-[#121212] text-gray-300 hover:bg-[#303030] transition border border-[#303030] text-sm"
          >
            + Workout
          </button>
          <button
            onClick={() => setModalState({ mode: 'log' })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium"
          >
            <PlusCircle size={18} /> Log Workout
          </button>
        </div>
      </div>

      <WorkoutLogList
        sessions={sessions}
        workouts={workouts}
        categories={categories}
        muscleGroups={muscleGroups}
        onEditSession={(session) => setModalState({ mode: 'log', initialWorkoutId: session.workout_id, initialLogDate: session.log_date })}
        onDeleteSession={handleDeleteSession}
      />

      {modalState.mode === 'log' && (
        <LogWorkoutModel
          workouts={workouts}
          categories={categories}
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
          hasSets={modalState.mode === 'editWorkout' ? setHasSets(modalState.workout.id) : false}
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

export default Workouts
