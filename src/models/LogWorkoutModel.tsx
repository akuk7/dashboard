import React, { useEffect, useState } from 'react'
import { X, Dumbbell, Save, PlusCircle, Copy, Trash2 } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Workout, WorkoutCategory, WorkoutSet, WorkoutSession } from '../types/workout'
import { checkAndBuildPRUpdate, sessionKey } from '../lib/workouts'
import { todayIST } from '../lib/dateUtils'

type WeightRow = { id: string; reps: string; weight: string }

export type LogWorkoutSaveResult = {
  key: string
  sets: WorkoutSet[]
  updatedWorkout: Workout | null
}

type Props = {
  workouts: Workout[]
  categories: WorkoutCategory[]
  sessions: WorkoutSession[]
  initialWorkoutId?: string
  initialLogDate?: string
  onClose: () => void
  onSaved: (result: LogWorkoutSaveResult) => void
}

const blankRow = (): WeightRow => ({ id: crypto.randomUUID(), reps: '', weight: '' })

const LogWorkoutModel: React.FC<Props> = ({ workouts, categories, sessions, initialWorkoutId, initialLogDate, onClose, onSaved }) => {
  const [workoutId, setWorkoutId] = useState(initialWorkoutId ?? '')
  const [logDate, setLogDate] = useState(initialLogDate ?? todayIST())
  const [rows, setRows] = useState<WeightRow[]>([blankRow()])
  const [distance, setDistance] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const workout = workouts.find((w) => w.id === workoutId) ?? null
  const category = categories.find((c) => c.id === workout?.category_id) ?? null
  const isWeightTraining = category?.measurement_type === 'reps_weight'

  // Reactively load whatever session already exists for the current (workout, date) pair -
  // this makes the same modal serve fresh logging, adding more sets to today's session, and
  // editing a past session, with no separate create/edit code paths.
  useEffect(() => {
    if (!workoutId || !logDate) return
    const existing = sessions.find((s) => s.workout_id === workoutId && s.log_date === logDate)

    if (category?.measurement_type === 'reps_weight') {
      if (existing && existing.sets.length > 0) {
        setRows(existing.sets.map((s) => ({ id: crypto.randomUUID(), reps: String(s.reps ?? ''), weight: String(s.weight ?? '') })))
      } else {
        setRows([blankRow()])
      }
    } else if (category?.measurement_type === 'distance_time') {
      const set = existing?.sets[0]
      if (set) {
        const total = set.duration_seconds ?? 0
        setDistance(set.distance != null ? String(set.distance) : '')
        setMinutes(String(Math.floor(total / 60)))
        setSeconds(String(total % 60))
      } else {
        setDistance('')
        setMinutes('')
        setSeconds('')
      }
    }
  }, [workoutId, logDate, sessions, category])

  const updateRow = (id: string, field: 'reps' | 'weight', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const duplicateRow = (row: WeightRow) => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), reps: row.reps, weight: row.weight }])
  }

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const isEditingExisting = !!sessions.find((s) => s.workout_id === workoutId && s.log_date === logDate && s.sets.length > 0)

  const handleSave = async () => {
    setError(null)
    if (!workout || !category) {
      setError('Pick a workout.')
      return
    }
    if (!logDate) {
      setError('Pick a date.')
      return
    }

    type SetPayload = { reps: number | null; weight: number | null; distance: number | null; duration_seconds: number | null }
    let setsPayload: SetPayload[]

    if (category.measurement_type === 'reps_weight') {
      const validRows = rows.filter((r) => r.reps.trim() !== '' && r.weight.trim() !== '')
      if (validRows.length === 0) {
        setError('Add at least one complete set (reps and weight).')
        return
      }
      setsPayload = validRows.map((r) => ({ reps: Number(r.reps), weight: Number(r.weight), distance: null, duration_seconds: null }))
    } else {
      const totalSeconds = (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
      if (!distance.trim() || totalSeconds <= 0) {
        setError('Enter a distance and duration.')
        return
      }
      setsPayload = [{ reps: null, weight: null, distance: Number(distance), duration_seconds: totalSeconds }]
    }

    setSaving(true)

    const existing = sessions.find((s) => s.workout_id === workoutId && s.log_date === logDate)
    if (existing && existing.sets.length > 0) {
      const { error: delError } = await supabase.from('workout_sets').delete().in('id', existing.sets.map((s) => s.id))
      if (delError) {
        console.error('Error replacing sets:', delError)
        setError('Could not save.')
        setSaving(false)
        return
      }
    }

    const rowsToInsert = setsPayload.map((s, i) => ({
      id: crypto.randomUUID(),
      workout_id: workoutId,
      log_date: logDate,
      set_number: i + 1,
      ...s,
    }))

    const { data: insertedData, error: insertError } = await supabase.from('workout_sets').insert(rowsToInsert).select('*')
    if (insertError) {
      console.error('Error logging sets:', insertError)
      setError('Could not save.')
      setSaving(false)
      return
    }
    const insertedSets = insertedData as WorkoutSet[]

    let updatedWorkout: Workout | null = null
    const prPatch = checkAndBuildPRUpdate(workout, category, setsPayload, logDate)
    if (prPatch) {
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .update(prPatch)
        .match({ id: workoutId })
        .select('*')
        .single()
      if (workoutError) console.error('Error updating PR:', workoutError)
      else updatedWorkout = workoutData as Workout
    }

    setSaving(false)
    onSaved({ key: sessionKey(workoutId, logDate), sets: insertedSets, updatedWorkout })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <Dumbbell className="w-5 h-5 text-gray-400" /> {isEditingExisting ? 'Edit Session' : 'Log Workout'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Workout</label>
            <select
              value={workoutId}
              onChange={(e) => setWorkoutId(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
            >
              <option value="" disabled>Select workout</option>
              {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Date</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
            />
          </div>
        </div>

        {category && isWeightTraining && (
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-300">Sets</label>
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={row.reps}
                    onChange={(e) => updateRow(row.id, 'reps', e.target.value)}
                    placeholder="Reps"
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={row.weight}
                    onChange={(e) => updateRow(row.id, 'weight', e.target.value)}
                    placeholder="Weight (kg)"
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none"
                  />
                  <button onClick={() => duplicateRow(row)} className="text-gray-500 hover:text-white flex-shrink-0" title="Duplicate set">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteRow(row.id)} className="text-gray-500 hover:text-red-500 flex-shrink-0" title="Remove set">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setRows((prev) => [...prev, blankRow()])}
              className="mt-2 flex items-center gap-2 text-sm text-gray-300 hover:text-white"
            >
              <PlusCircle className="w-4 h-4" /> Add Set
            </button>
          </div>
        )}

        {category && !isWeightTraining && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">Distance (km)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">Minutes</label>
              <input
                type="number"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none"
              />
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-[#303030]">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 shadow-lg shadow-white/5 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default LogWorkoutModel
