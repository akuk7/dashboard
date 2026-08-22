import React, { useMemo } from 'react'
import { X, Dumbbell, Edit, Trash2 } from 'lucide-react'
import type { MuscleGroup, Workout, WorkoutCategory } from '../types/workout'
import { formatDisplayIST } from '../lib/dateUtils'

type Props = {
  workouts: Workout[]
  categories: WorkoutCategory[]
  muscleGroups: MuscleGroup[]
  onClose: () => void
  onEdit: (workout: Workout) => void
  onDelete: (id: string) => void
}

const ViewWorkoutsModel: React.FC<Props> = ({ workouts, categories, muscleGroups, onClose, onEdit, onDelete }) => {
  const muscleGroupsById = useMemo(() => {
    const map: Record<string, MuscleGroup> = {}
    muscleGroups.forEach((m) => { map[m.id] = m })
    return map
  }, [muscleGroups])

  const handleDelete = (workout: Workout) => {
    if (!window.confirm(`Delete "${workout.name}"? All of its logged sets will be deleted too.`)) return
    onDelete(workout.id)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <Dumbbell className="w-5 h-5 text-gray-400" /> Workouts
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mr-2 pr-2">
          {categories.map((category) => {
            const inCategory = workouts.filter((w) => w.category_id === category.id)
            if (inCategory.length === 0) return null

            return (
              <div key={category.id} className="mb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{category.name}</h4>
                <div className="flex flex-col gap-2">
                  {inCategory.map((w) => (
                    <div key={w.id} className="p-3 bg-[#0A0A0A] rounded-lg border border-[#303030]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{w.name}</p>
                          {w.target_muscle.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {w.target_muscle.map((muscleId) => (
                                <span key={muscleId} className="text-[10px] px-2 py-0.5 rounded-full bg-[#121212] border border-[#303030] text-gray-400">
                                  {muscleGroupsById[muscleId]?.name ?? 'Unknown'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => onEdit(w)} className="text-gray-500 hover:text-white" title="Edit workout">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(w)} className="text-gray-500 hover:text-red-500" title="Delete workout">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {category.measurement_type === 'reps_weight' ? (
                          w.pr_value != null ? (
                            <>PR: <span className="text-amber-400 font-semibold">{w.pr_weight}kg &times; {w.pr_reps} = {w.pr_value}</span>
                              {w.pr_achieved_at && <> on {formatDisplayIST(w.pr_achieved_at)}</>}</>
                          ) : 'No PR yet'
                        ) : (
                          w.pr_distance != null ? (
                            <>PR: <span className="text-amber-400 font-semibold">{w.pr_distance}</span>
                              {w.pr_achieved_at && <> on {formatDisplayIST(w.pr_achieved_at)}</>}</>
                          ) : 'No PR yet'
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {workouts.length === 0 && <p className="text-gray-500 text-sm">No workouts yet.</p>}
        </div>
      </div>
    </div>
  )
}

export default ViewWorkoutsModel
