import React, { useEffect, useMemo, useState } from 'react'
import type { Habit } from '../types/habit'
import { Check } from 'lucide-react'
import supabase from '../lib/supabase'

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

// Supabase Record Structure Type (assuming columns: habit_id, date, done)
type HabitRecordRow = {
    habit_id: string;
    date: string;
    done: boolean;
};

const HabitTracker: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([])
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>({})
  
  // Sticking to 15 days in one view
  const dates = useMemo(() => generateDates(15), []) 

  useEffect(() => {
    const loadData = async () => {
      // 1. Load Habits
      const { data: hData, error: hErr } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (hErr) console.error('Error loading habits:', hErr)
      setHabits((hData as Habit[]) || [])

      // 2. Load Records for the current date range
      const { data: rData, error: rErr } = await supabase
        .from('habit_records')
        .select('habit_id,date,done')
        .in('date', dates)
        
      if (rErr) console.error('Error loading records:', rErr)

 
      const map: Record<string, Record<string, boolean>> = {}
      const rows = (rData as HabitRecordRow[]) ?? []
      rows.forEach((row: HabitRecordRow) => {
        map[row.date] = map[row.date] || {}
        map[row.date][row.habit_id] = !!row.done
      })
      setRecords(map)
    }
    loadData()
  }, [dates]) // Reload when the date range changes (though fixed at 15 here)
  
  const toggle = async (date: string, habitId: string) => {
    const isChecked = !!(records[date] && records[date][habitId])
    
    if (isChecked) {
      // 1. DELETE record from Supabase
      const { error } = await supabase
        .from('habit_records')
        .delete()
        .match({ habit_id: habitId, date })
        
      if (error) {
        console.error('Error deleting record:', error)
        return
      }

      // 2. Update local state
      setRecords(prev => {
        const next = { ...prev }
        if (next[date] && next[date][habitId]) {
          delete next[date][habitId]
          // If the date object is now empty, delete it too (optional cleanup)
          if (Object.keys(next[date]).length === 0) {
              delete next[date];
          }
        }
        return next
      })

    } else {
      // 1. INSERT/UPSERT record into Supabase
      const newRecord: Omit<HabitRecordRow, 'done'> & { done: boolean } = {
          habit_id: habitId, 
          date: date, 
          done: true 
      }
      const { error } = await supabase.from('habit_records').upsert([newRecord])
      
      if (error) {
        console.error('Error upserting record:', error)
        return
      }

      // 2. Update local state
      setRecords(prev => {
        const next = { ...prev }
        next[date] = { ...(next[date] || {}), [habitId]: true }
        return next
      })
    }
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
    <div className="flex gap-4  p-4 rounded-lg overflow-x-auto">
      {/* Habit Legend/Sidebar */}
      {/* <div className="w-52 bg-[#f5c53a] text-gray-900 rounded-lg p-4 overflow-auto">
        <h3 className="font-semibold mb-3  ">Habits</h3>
        <ul className="space-y-2">
          {habits.map((h) => (
            <li key={h.id} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded" style={{ background: h.color }} />
              <span className="text-sm">{h.name}</span>
            </li>
          ))}
        </ul>
      </div> */}

      <div className="flex-1 bg-[#373631] rounded-lg p-2"> 
        <div> 
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr>
                {/* Sticky Habit Name Header */}
                <th className="sticky left-0 bg-gray-900 text-left px-3 py-2 w-40">Habit</th>
                
                {/* Date Headers - No min-width, allowing columns to evenly spread */}
                {dates.map((d) => (
                  <th key={d} className="p-2 px-1 text-center text-xs"> 
                    <div className="bg-gray-900 rounded p-1">
                      {new Date(d).getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => (
                <tr key={h.id} className="align-center border-t border-white/5">
                  {/* Sticky Habit Name Cell */}
                  <td className="sticky left-0 bg-gray-800 px-3  text-sm">{h.name}</td>
                  
                  {/* Habit Check Cells */}
                  {dates.map((d) => {
                    const checked = !!(records[d] && records[d][h.id]);
                    const bgColor = h.color || '#60a5fa'; // Default blue color
                    
                    return (
                      <td key={d} className=" px-5 py-1 text-center">
                        <button
                          onClick={() => toggle(d, h.id)}
                          style={{
                            backgroundColor: `${bgColor}30`, 
                            border: d === formatDate(new Date()) ? '1px solid white' : 'none'
                          }}
                          // w-12 h-12 container
                          className="flex items-center justify-center w-12 h-12 rounded-md hover:opacity-100 " 
                          title={checked ? 'Completed' : 'Mark complete'}
                        >
                          <Check 
                            // w-5 h-5 icon size
                            className="w-7 h-7" 
                            style={{ 
                              color: checked ? bgColor : 'transparent', 
                              stroke: checked ? bgColor : 'transparent',
                              // Thicker stroke for prominence
                              strokeWidth: checked ? 10 : 0 
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