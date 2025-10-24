import React, { useState } from 'react'
import { X, PlusCircle } from 'lucide-react'
import type { Habit } from '../types/habit'
import supabase from '../lib/supabase'

type Props = {
  onClose: () => void
  onAdd: () => void
}

const AddHabit: React.FC<Props> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('')
  // Default color should still be functional but the UI won't rely on it heavily
  const [color, setColor] = useState('#60a5fa') 

  const handleAdd = async () => {
    if (!name.trim()) return
    
    const newHabit: Omit<Habit, 'created_at'> & { created_at: string } = {
      id: crypto.randomUUID(), 
      name: name.trim(),
      color,
      created_at: new Date().toISOString(),
    }
    
    const { error } = await supabase.from('habits').insert([newHabit])
    
    if (error) {
      console.error('Error adding habit:', error)
      return
    }
    
    onAdd() 
    onClose()
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Modal card style: dark background, subtle border */}
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl shadow-black/50">
        <div className="flex justify-between items-center mb-6">
          {/* Accent on icon is subtle gray/white */}
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <PlusCircle className="w-5 h-5 text-gray-400" /> New Habit
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <label className="block mb-2 text-sm font-medium text-gray-300">Habit Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          // Input style: darker background, subtle border, white focus
          className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-500 transition"
          placeholder="e.g. Daily reading or Gym session"
        />

        <label className="block mb-2 text-sm font-medium text-gray-300">Accent Color (Internal Tracking Only)</label>
        <div className="mb-6">
            <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 p-0 border-none rounded-md cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
            />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#303030]">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg bg-transparent text-gray-400 hover:text-white transition border border-transparent hover:border-[#303030]"
          >
            Cancel
          </button>
          <button 
            onClick={handleAdd} 
            // Primary action button is now high-contrast white/gray
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition shadow-lg shadow-white/10"
          >
            Add Habit
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddHabit