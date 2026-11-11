import React, { useMemo, useState } from 'react'
import { X, ListPlus, Save, PlusCircle, Copy, Trash2 } from 'lucide-react'
import supabase from '../lib/supabase'
import type { MuscleGroup, Workout, WorkoutCategory, WorkoutSet, WorkoutSession } from '../types/workout'
import { checkAndBuildPRUpdate } from '../lib/workouts'
import { formatDisplayIST, todayIST } from '../lib/dateUtils'

type Row = { id: string; reps: string; weight: string; value: string } // value = calisthenics reps or seconds
type Entry = { id: string; workoutId: string; rows: Row[]; distance: string; minutes: string; seconds: string }

export type LogDaySaveResult = {
  date: string
  sets: WorkoutSet[]
  updatedWorkouts: Workout[]
}

type Props = {
  workouts: Workout[]
  categories: WorkoutCategory[]
  muscleGroups: MuscleGroup[]
  sessions: WorkoutSession[]
  initialLogDate?: string
  onClose: () => void
  onSaved: (result: LogDaySaveResult) => void
}

const blankRow = (): Row => ({ id: crypto.randomUUID(), reps: '', weight: '', value: '' })

const inputCls = 'w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none'

const LogDayModel: React.FC<Props> = ({ workouts, categories, muscleGroups, sessions, initialLogDate, onClose, onSaved }) => {
  const workoutsById = useMemo(() => new Map(workouts.map((w) => [w.id, w])), [workouts])
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // Turns stored sessions into editable entries (fresh ids so a copy never aliases the source rows).
  const entriesFromSessions = (list: WorkoutSession[]): Entry[] =>
    list.flatMap((s) => {
      const workout = workoutsById.get(s.workout_id)
      const category = workout ? categoriesById.get(workout.category_id) : undefined
      if (!workout || !category) return []
      const entry: Entry = { id: crypto.randomUUID(), workoutId: workout.id, rows: [], distance: '', minutes: '', seconds: '' }
      if (category.measurement_type === 'reps_weight') {
        entry.rows = s.sets.map((x) => ({ id: crypto.randomUUID(), reps: String(x.reps ?? ''), weight: String(x.weight ?? ''), value: '' }))
      } else if (category.measurement_type === 'calisthenics') {
        entry.rows = s.sets.map((x) => ({
          id: crypto.randomUUID(), reps: '', weight: '',
          value: workout.calisthenics_metric === 'time' ? String(x.duration_seconds ?? '') : String(x.reps ?? ''),
        }))
      } else {
        const set = s.sets[0]
        const total = set?.duration_seconds ?? 0
        entry.distance = set?.distance != null ? String(set.distance) : ''
        entry.minutes = set ? String(Math.floor(total / 60)) : ''
        entry.seconds = set ? String(total % 60) : ''
      }
      return [entry]
    })

  const sessionsOnDate = (date: string) => sessions.filter((s) => s.log_date === date)

  const [logDate, setLogDate] = useState(initialLogDate ?? todayIST())
  const [entries, setEntries] = useState<Entry[]>(() => entriesFromSessions(sessionsOnDate(initialLogDate ?? todayIST())))
  const [copyFrom, setCopyFrom] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(
    () => categories.find((c) => c.measurement_type === 'reps_weight')?.id ?? 'all'
  )
  const [muscleFilter, setMuscleFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Other dates that have logged sessions, newest first (sessions are already sorted that way).
  const copyOptions = useMemo(() => {
    const counts = new Map<string, number>()
    sessions.forEach((s) => { if (s.log_date !== logDate) counts.set(s.log_date, (counts.get(s.log_date) ?? 0) + 1) })
    return Array.from(counts.entries())
  }, [sessions, logDate])

  const showMuscleFilter = categoriesById.get(categoryFilter)?.measurement_type === 'reps_weight'
  const addable = useMemo(() => {
    const used = new Set(entries.map((e) => e.workoutId))
    let list = workouts.filter((w) => !used.has(w.id))
    if (categoryFilter !== 'all') list = list.filter((w) => w.category_id === categoryFilter)
    if (showMuscleFilter && muscleFilter !== 'all') list = list.filter((w) => w.target_muscle.includes(muscleFilter))
    return list
  }, [workouts, entries, categoryFilter, showMuscleFilter, muscleFilter])

  const handleDateChange = (date: string) => {
    setLogDate(date)
    setCopyFrom('')
    setEntries(entriesFromSessions(sessionsOnDate(date)))
  }

  const handleCopy = () => {
    if (!copyFrom) return
    if (entries.length > 0 && !window.confirm('Replace the current workouts with the copied day?')) return
    setEntries(entriesFromSessions(sessionsOnDate(copyFrom)))
    setError(null)
  }

  const addWorkout = (workoutId: string) => {
    const workout = workoutsById.get(workoutId)
    if (!workout) return
    const category = categoriesById.get(workout.category_id)
    setEntries((prev) => [...prev, {
      id: crypto.randomUUID(), workoutId, distance: '', minutes: '', seconds: '',
      rows: category?.measurement_type === 'distance_time' ? [] : [blankRow()],
    }])
  }

  const patchEntry = (id: string, fn: (e: Entry) => Entry) => setEntries((prev) => prev.map((e) => (e.id === id ? fn(e) : e)))
  const patchRow = (entryId: string, rowId: string, field: 'reps' | 'weight' | 'value', v: string) =>
    patchEntry(entryId, (e) => ({ ...e, rows: e.rows.map((r) => (r.id === rowId ? { ...r, [field]: v } : r)) }))

  const handleSave = async () => {
    setError(null)
    if (!logDate) return setError('Pick a date.')
    if (entries.length === 0) return setError('Add at least one workout.')

    type SetPayload = { reps: number | null; weight: number | null; distance: number | null; duration_seconds: number | null }
    const built: { workout: Workout; category: WorkoutCategory; sets: SetPayload[] }[] = []

    for (const e of entries) {
      const workout = workoutsById.get(e.workoutId)
      const category = workout ? categoriesById.get(workout.category_id) : undefined
      if (!workout || !category) continue
      let sets: SetPayload[]
      if (category.measurement_type === 'reps_weight') {
        sets = e.rows.filter((r) => r.reps.trim() !== '' && r.weight.trim() !== '')
          .map((r) => ({ reps: Number(r.reps), weight: Number(r.weight), distance: null, duration_seconds: null }))
      } else if (category.measurement_type === 'calisthenics') {
        const isTime = workout.calisthenics_metric === 'time'
        sets = e.rows.filter((r) => r.value.trim() !== '').map((r) =>
          isTime
            ? { reps: null, weight: null, distance: null, duration_seconds: Number(r.value) }
            : { reps: Number(r.value), weight: null, distance: null, duration_seconds: null })
      } else {
        const total = (Number(e.minutes) || 0) * 60 + (Number(e.seconds) || 0)
        sets = e.distance.trim() && total > 0
          ? [{ reps: null, weight: null, distance: Number(e.distance), duration_seconds: total }]
          : []
      }
      if (sets.length === 0) return setError(`${workout.name}: add at least one complete set (or remove it).`)
      built.push({ workout, category, sets })
    }

    setSaving(true)
    const oldIds = sessionsOnDate(logDate).flatMap((s) => s.sets.map((x) => x.id))
    const rowsToInsert = built.flatMap((b) =>
      b.sets.map((s, i) => ({ id: crypto.randomUUID(), workout_id: b.workout.id, log_date: logDate, set_number: i + 1, ...s }))
    )

    // Insert first, delete old after: a failed insert leaves the day's existing data intact.
    const { data: inserted, error: insertError } = await supabase.from('workout_sets').insert(rowsToInsert).select('*')
    if (insertError) {
      console.error('Error logging day:', insertError)
      setError('Could not save.')
      setSaving(false)
      return
    }
    if (oldIds.length > 0) {
      const { error: delError } = await supabase.from('workout_sets').delete().in('id', oldIds)
      if (delError) {
        console.error('Error removing old sets:', delError)
        // New rows are already in; roll them back so the day isn't left duplicated.
        await supabase.from('workout_sets').delete().in('id', rowsToInsert.map((r) => r.id))
        setError('Could not save.')
        setSaving(false)
        return
      }
    }

    const updatedWorkouts: Workout[] = []
    for (const b of built) {
      const patch = checkAndBuildPRUpdate(b.workout, b.category, b.sets, logDate)
      if (!patch) continue
      const { data, error: prError } = await supabase.from('workouts').update(patch).match({ id: b.workout.id }).select('*').single()
      if (prError) console.error('Error updating PR:', prError)
      else updatedWorkouts.push(data as Workout)
    }

    setSaving(false)
    onSaved({ date: logDate, sets: inserted as WorkoutSet[], updatedWorkouts })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-[#303030]">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <ListPlus className="w-5 h-5 text-gray-400" /> Log Full Day
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400">Date</label>
              <input type="date" value={logDate} onChange={(e) => handleDateChange(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400">Copy from another day</label>
              <div className="flex gap-2">
                <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={inputCls}>
                  <option value="">Select day</option>
                  {copyOptions.map(([date, n]) => (
                    <option key={date} value={date}>{formatDisplayIST(date)} · {n} workout{n === 1 ? '' : 's'}</option>
                  ))}
                </select>
                <button
                  onClick={handleCopy}
                  disabled={!copyFrom}
                  className="px-3 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-[#303030] pb-4">
            <label className="block mb-1 text-xs font-medium text-gray-400">Add workout</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputCls}>
                <option value="all">All Types</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {showMuscleFilter && (
                <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} className={inputCls}>
                  <option value="all">All Muscles</option>
                  {muscleGroups.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              <select
                value=""
                onChange={(e) => { if (e.target.value) addWorkout(e.target.value) }}
                className={`${inputCls} ${showMuscleFilter ? '' : 'sm:col-span-2'}`}
              >
                <option value="">+ Select workout to add</option>
                {addable.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {entries.map((e) => {
              const workout = workoutsById.get(e.workoutId)
              const category = workout ? categoriesById.get(workout.category_id) : undefined
              if (!workout || !category) return null
              const isTime = workout.calisthenics_metric === 'time'
              return (
                <div key={e.id} className="border border-[#303030] rounded-lg p-3 bg-[#0E0E0E]">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-white">{workout.name}</p>
                    <button
                      onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
                      className="text-gray-500 hover:text-red-500" title="Remove workout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {category.measurement_type === 'distance_time' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" min="0" step="0.01" placeholder="km" value={e.distance}
                        onChange={(ev) => patchEntry(e.id, (x) => ({ ...x, distance: ev.target.value }))} className={inputCls} />
                      <input type="number" min="0" placeholder="min" value={e.minutes}
                        onChange={(ev) => patchEntry(e.id, (x) => ({ ...x, minutes: ev.target.value }))} className={inputCls} />
                      <input type="number" min="0" max="59" placeholder="sec" value={e.seconds}
                        onChange={(ev) => patchEntry(e.id, (x) => ({ ...x, seconds: ev.target.value }))} className={inputCls} />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        {e.rows.map((r) => (
                          <div key={r.id} className="flex items-center gap-2">
                            {category.measurement_type === 'reps_weight' ? (
                              <>
                                <input type="number" min="0" placeholder="Reps" value={r.reps}
                                  onChange={(ev) => patchRow(e.id, r.id, 'reps', ev.target.value)} className={inputCls} />
                                <input type="number" min="0" step="0.5" placeholder="Weight (kg)" value={r.weight}
                                  onChange={(ev) => patchRow(e.id, r.id, 'weight', ev.target.value)} className={inputCls} />
                              </>
                            ) : (
                              <input type="number" min="0" placeholder={isTime ? 'Seconds' : 'Reps'} value={r.value}
                                onChange={(ev) => patchRow(e.id, r.id, 'value', ev.target.value)} className={inputCls} />
                            )}
                            <button
                              onClick={() => patchEntry(e.id, (x) => ({ ...x, rows: [...x.rows, { ...r, id: crypto.randomUUID() }] }))}
                              className="text-gray-500 hover:text-white shrink-0" title="Duplicate set"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => patchEntry(e.id, (x) => ({ ...x, rows: x.rows.filter((y) => y.id !== r.id) }))}
                              className="text-gray-500 hover:text-red-500 shrink-0" title="Remove set"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => patchEntry(e.id, (x) => ({ ...x, rows: [...x.rows, blankRow()] }))}
                        className="mt-2 flex items-center gap-1 text-xs text-gray-300 hover:text-white"
                      >
                        <PlusCircle className="w-4 h-4" /> Add Set
                      </button>
                    </>
                  )}
                </div>
              )
            })}
            {entries.length === 0 && <p className="text-sm text-gray-500">No workouts yet. Add one below or copy another day.</p>}
          </div>

        </div>

        <div className="p-4 border-t border-[#303030]">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Day
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogDayModel
