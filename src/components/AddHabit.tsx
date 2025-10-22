import React, { useState } from 'react'
import { X, PlusCircle } from 'lucide-react'
import type { Habit } from '../types/habit'

type Props = {
  onClose: () => void
  onAdd: (habit: Habit) => void
}

const AddHabit: React.FC<Props> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#60a5fa')

  const handleAdd = () => {
    if (!name.trim()) return
    const habit: Habit = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      color,
    }
    onAdd(habit)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-gray-800 text-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Add Habit
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white">
            <X />
          </button>
        </div>

        <label className="block mb-2 text-sm">Habit name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-700 rounded px-3 py-2 mb-4"
          placeholder="e.g. Morning stretch"
        />

        <label className="block mb-2 text-sm">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="mb-4 h-10 w-14 p-0 bg-transparent border-0"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700">
            Cancel
          </button>
          <button onClick={handleAdd} className="px-4 py-2 rounded bg-blue-500">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddHabit