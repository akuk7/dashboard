import React, { useMemo, useState } from 'react'
import type { Habit } from '../types/habit'
import { Check } from 'lucide-react'

const HABITS_KEY = 'habits'
const HABIT_RECORDS_KEY = 'habitRecords' // { "YYYY-MM-DD": { habitId: true } }

const readHabits = (): Habit[] => {
  try {
    return JSON.parse(localStorage.getItem(HABITS_KEY) || '[]')
  } catch {
    return []
  }
}

const readRecords = (): Record<string, Record<string, boolean>> => {
  try {
    return JSON.parse(localStorage.getItem(HABIT_RECORDS_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeRecords = (r: Record<string, Record<string, boolean>>) => {
  localStorage.setItem(HABIT_RECORDS_KEY, JSON.stringify(r))
}

const formatDate = (d: Date) => d.toISOString().split('T')[0]

/**
 * Generates an array of formatted date strings for the last 'days' days, 
 * including today.
 */
const generateDates = (days: number) => {
  const arr: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    arr.push(formatDate(d))
  }
  return arr
}

// --- Component Start ---

const HabitTracker: React.FC = () => {
  const [habits] = useState<Habit[]>(readHabits())
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>(readRecords())
  
  // Sticking to 15 days in one view
  const dates = useMemo(() => generateDates(15), []) 

  const toggle = (date: string, habitId: string) => {
    const next = { ...records }
    next[date] = { ...(next[date] || {}) }
    next[date][habitId] = !next[date][habitId]
    setRecords(next)
    writeRecords(next)
  }

  if (habits.length === 0) {
    return (
      <div className="p-6 bg-white/5 rounded-lg text-white">
        <h3 className="text-lg font-semibold mb-2">Habits</h3>
        <p className="text-sm text-gray-300">No habits yet. Add one from the Habit Dashboard.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* Habit Legend/Sidebar */}
      <div className="w-52 bg-white/5 rounded-lg p-4 overflow-auto">
        <h3 className="font-semibold mb-3 text-white">Habits</h3>
        <ul className="space-y-2">
          {habits.map((h) => (
            <li key={h.id} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded" style={{ background: h.color }} />
              <span className="text-sm">{h.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Habit Tracking Grid */}
      {/* Removed 'overflow-auto' from the outer div and 'overflow-x-auto' from the inner div 
          to remove the scrollbar control, letting the table adjust its width */}
      <div className="flex-1 bg-white/5 rounded-lg p-2"> 
        <div> 
          <table className="w-full table-fixed  border-collapse">
            <thead>
              <tr>
                {/* Sticky Habit Name Header */}
                <th className="sticky left-0 bg-gray-800 text-left px-3 py-2 w-40">Habit</th>
                
                {/* Date Headers - No min-width, allowing columns to evenly spread */}
                {dates.map((d) => (
                  <th key={d} className="p-2 px-1 text-center text-xs"> 
                    <div className="bg-gray-800 rounded p-1">
                      {new Date(d).getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => (
                <tr key={h.id} className="align-center felx justify-centerborder-t border-white/5">
                  {/* Sticky Habit Name Cell */}
                  <td className="sticky left-0 bg-gray-800 px-3 py-2 text-sm">{h.name}</td>
                  
                  {/* Habit Check Cells */}
                  {dates.map((d) => {
                    const checked = !!(records[d] && records[d][h.id]);
                    const bgColor = h.color || '#60a5fa'; // Default blue color
                    
                    return (
                      <td key={d} className="p-1 px-1 text-center">
                        <button
                          onClick={() => toggle(d, h.id)}
                          style={{
                            backgroundColor: `${bgColor}20`, 
                            border: d === formatDate(new Date()) ? '1px solid white' : 'none'
                          }}
                          // w-14 h-14 for a large container
                          className="flex items-center justify-center w-12 h-12 rounded-md hover:opacity-80 transition-opacity" 
                          title={checked ? 'Completed' : 'Mark complete'}
                        >
                          <Check 
                            // w-10 h-10 to almost fill the box
                            className="w-5 h-5" 
                            style={{ 
                              color: checked ? bgColor : 'transparent', 
                              stroke: checked ? bgColor : 'transparent',
                              // Thicker stroke for prominence
                              strokeWidth: checked ? 4 : 0 
                            }}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default HabitTracker