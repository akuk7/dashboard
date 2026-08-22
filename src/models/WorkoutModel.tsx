import React, { useEffect, useState } from 'react'
import { X, PlusCircle, Save } from 'lucide-react'
import supabase from '../lib/supabase'
import type { MuscleGroup, Workout, WorkoutCategory } from '../types/workout'

type Props = {
  workout: Workout | null // null for new, populated for editing
  categories: WorkoutCategory[]
  muscleGroups: MuscleGroup[]
  hasSets: boolean // true if this workout (when editing) already has logged sets - locks category
  onClose: () => void
  onSave: (workout: Workout) => void
}

const WorkoutModel: React.FC<Props> = ({ workout, categories, muscleGroups, hasSets, onClose, onSave }) => {
  const isEditing = workout !== null

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [targetMuscle, setTargetMuscle] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (workout) {
      setName(workout.name)
      setCategoryId(workout.category_id)
      setTargetMuscle(workout.target_muscle)
    } else {
      setName('')
      setCategoryId(categories[0]?.id ?? '')
      setTargetMuscle([])
    }
  }, [workout, categories])

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const isWeightTraining = selectedCategory?.measurement_type === 'reps_weight'

  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId)
    const nextCategory = categories.find((c) => c.id === nextCategoryId)
    if (nextCategory?.measurement_type !== 'reps_weight') setTargetMuscle([]) // cardio has no target muscle
  }

  const toggleMuscle = (muscleId: string) => {
    setTargetMuscle((prev) => (prev.includes(muscleId) ? prev.filter((m) => m !== muscleId) : [...prev, muscleId]))
  }

  const handleSave = async () => {
    if (!name.trim() || !categoryId) {
      setError('Name and category are required.')
      return
    }

    const payload = {
      name: name.trim(),
      category_id: categoryId,
      target_muscle: isWeightTraining ? targetMuscle : [],
    }

    const { data, error: saveError } = isEditing
      ? await supabase.from('workouts').update(payload).match({ id: workout!.id }).select('*').single()
      : await supabase.from('workouts').insert([{ id: crypto.randomUUID(), ...payload }]).select('*').single()

    if (saveError) {
      console.error('Error saving workout:', saveError)
      setError('Could not save workout.')
      return
    }

    onSave(data as Workout)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <PlusCircle className="w-5 h-5 text-gray-400" /> {isEditing ? 'Edit Workout' : 'New Workout'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <label className="block mb-2 text-sm font-medium text-gray-300">Workout Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 mb-4 text-white outline-none"
          placeholder="e.g. Bench Press"
        />

        <label className="block mb-2 text-sm font-medium text-gray-300">Category</label>
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={hasSets}
          className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 mb-1 text-white outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {hasSets && (
          <p className="text-xs text-gray-500 mb-4">Category is locked because this workout already has logged sets.</p>
        )}
        {!hasSets && <div className="mb-4" />}

        {isWeightTraining && (
          <>
            <label className="block mb-2 text-sm font-medium text-gray-300">Target Muscle</label>
            <div className="flex flex-wrap gap-2 mb-4 bg-[#0A0A0A] p-3 rounded-lg border border-[#303030]">
              {muscleGroups.map((muscle) => {
                const isActive = targetMuscle.includes(muscle.id)
                return (
                  <button
                    key={muscle.id}
                    onClick={() => toggleMuscle(muscle.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isActive ? 'bg-white border-white text-black' : 'bg-transparent border-[#303030] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {muscle.name}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-[#303030]">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 shadow-lg shadow-white/5 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Create Workout'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkoutModel
