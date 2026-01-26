import React, { useState } from 'react'
import { X, PlusCircle } from 'lucide-react'
import supabase from '../lib/supabase'

type Props = {
  onClose: () => void
  onAdd: () => void
}

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const AddHabit: React.FC<Props> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#60a5fa')
  const [frequency, setFrequency] = useState<number[]>([1, 2, 3, 4, 5]); // Default Weekdays
  const [createdAt, setCreatedAt] = useState(new Date().toISOString())

  const toggleDay = (val: number) => {
    setFrequency(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  };

  const handleAdd = async () => {
    if (!name.trim() || frequency.length === 0) return

    const newHabit = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      frequency,
      created_at: createdAt,
    }

    const { error } = await supabase.from('habits').insert([newHabit])
    if (error) return console.error('Error adding habit:', error)

    onAdd()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <PlusCircle className="w-5 h-5 text-gray-400" /> New Habit
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <label className="block mb-2 text-sm font-medium text-gray-300">Habit Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 mb-6 text-white outline-none"
          placeholder="e.g. Morning Yoga"
        />

        <label className="block mb-2 text-sm font-medium text-gray-300">Frequency (Repeat on)</label>
        <div className="flex justify-between mb-6 bg-[#0A0A0A] p-3 rounded-lg border border-[#303030]">
          {DAYS.map((day) => {
            const isActive = frequency.includes(day.value);
            return (
              <div key={day.value} className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase text-gray-500 font-bold">{day.label}</span>
                <button
                  onClick={() => toggleDay(day.value)}
                  className={`w-8 h-8 rounded-md border transition-all flex items-center justify-center ${isActive
                    ? 'bg-white border-white text-black'
                    : 'bg-transparent border-[#303030] text-gray-500 hover:border-gray-500'
                    }`}
                >
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center mb-6">
          <label className="text-sm font-medium text-gray-300">Start Date</label>
          <input
            type="date"
            value={createdAt.split('T')[0]}
            onChange={(e) => setCreatedAt(new Date(e.target.value).toISOString())}
            className="bg-[#0A0A0A] border border-[#303030] text-gray-100 rounded-lg px-3 py-1 text-sm focus:border-white outline-none"
          />
        </div>

        <div className="flex justify-between items-center mb-6">
          <label className="text-sm font-medium text-gray-300">Color Tag</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-12 bg-transparent border-none cursor-pointer"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#303030]">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleAdd} className="px-6 py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 shadow-lg shadow-white/5">
            Create Habit
          </button>
        </div>
      </div>
    </div>
  )
}

// Add this helper icon for the day checkboxes
const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default AddHabit