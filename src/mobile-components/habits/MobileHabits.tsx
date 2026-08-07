import { useEffect, useMemo, useState } from 'react'
import { PlusCircle, Check } from 'lucide-react'
import supabase from '../../lib/supabase'
import type { Habit } from '../../types/habit'
import AddHabit from '../../components/AddHabit'
import MobileHeader from '../MobileHeader'

type PeriodKeys = 'week' | 'month' | 'year'
const PERIOD_DAYS: Record<PeriodKeys, number> = { week: 7, month: 30, year: 365 }
const PERIOD_LABELS: Record<PeriodKeys, string> = { week: '7 Days', month: '30 Days', year: 'Year' }
const PERIOD_ORDER: PeriodKeys[] = ['week', 'month', 'year']
const TRACKER_DAYS = 5

type HabitRecordRow = { habit_id: string; date: string; done: boolean }

const formatDate = (d: Date) => d.toISOString().split('T')[0]

const genRange = (days: number) => {
  const res: string[] = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const dt = new Date(today)
    dt.setDate(today.getDate() - i)
    dt.setUTCHours(0, 0, 0, 0)
    res.push(formatDate(dt))
  }
  return res
}

const generateTrackerDates = (days: number) => {
  const arr: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    arr.push(formatDate(d))
  }
  return arr
}

const MobileHabits: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKeys>('week')
  const [habits, setHabits] = useState<Habit[]>([])
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>({})
  const [showAdd, setShowAdd] = useState(false)

  const trackerDates = useMemo(() => generateTrackerDates(TRACKER_DAYS), [])

  const loadHabits = async () => {
    const { data } = await supabase.from('habits').select('*').order('created_at', { ascending: false })
    setHabits((data as Habit[]) || [])
  }

  useEffect(() => {
    loadHabits()
  }, [])

  useEffect(() => {
    const loadRecords = async () => {
      const dates = Array.from(new Set([...genRange(PERIOD_DAYS[period]), ...trackerDates]))
      const { data, error } = await supabase.from('habit_records').select('habit_id,date,done').in('date', dates)
      if (error) {
        console.error('Error loading records:', error)
        return
      }
      const map: Record<string, Record<string, boolean>> = {}
      ;((data ?? []) as HabitRecordRow[]).forEach((r) => {
        map[r.date] = map[r.date] || {}
        map[r.date][r.habit_id] = !!r.done
      })
      setRecords(map)
    }
    loadRecords()
  }, [period, trackerDates])

  const stats = useMemo(() => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    let totalDone = 0
    let totalPossible = 0

    habits.forEach((h) => {
      const habitStart = new Date(h.created_at)
      habitStart.setUTCHours(0, 0, 0, 0)
      const daysInPeriod = PERIOD_DAYS[period]
      const datesToCheck: string[] = []

      for (let i = 0; i < daysInPeriod; i++) {
        const dt = new Date(today)
        dt.setDate(today.getDate() - i)
        dt.setUTCHours(0, 0, 0, 0)
        if (dt < habitStart) break
        datesToCheck.push(formatDate(dt))
      }

      datesToCheck.forEach((d) => {
        const dayOfWeek = new Date(d).getDay()
        const isScheduled = h.frequency ? h.frequency.includes(dayOfWeek) : true
        if (!isScheduled) return
        totalPossible += 1
        if (records[d]?.[h.id]) totalDone += 1
      })
    })

    return {
      done: totalDone,
      total: totalPossible,
      pct: totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0,
    }
  }, [habits, records, period])

  const toggle = async (date: string, habitId: string) => {
    const isChecked = !!(records[date] && records[date][habitId])

    if (isChecked) {
      const { error } = await supabase.from('habit_records').delete().match({ habit_id: habitId, date })
      if (error) return console.error('Error deleting record:', error)
      setRecords((prev) => {
        const next = { ...prev }
        if (next[date]) {
          const dayMap = { ...next[date] }
          delete dayMap[habitId]
          next[date] = dayMap
        }
        return next
      })
    } else {
      const { error } = await supabase.from('habit_records').upsert([{ habit_id: habitId, date, done: true }])
      if (error) return console.error('Error upserting record:', error)
      setRecords((prev) => ({
        ...prev,
        [date]: { ...(prev[date] || {}), [habitId]: true },
      }))
    }
  }

  return (
    <div className="min-h-full pb-4">
      <MobileHeader
        title="Habits"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-lg text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4" /> Add
          </button>
        }
      />

      <div className="px-4 pt-4">
        <div className="flex bg-[#121212] border border-[#303030] rounded-xl p-1 mb-4">
          {PERIOD_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                period === key ? 'bg-[#303030] text-white' : 'text-gray-400'
              }`}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="bg-[#121212] border border-[#303030] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Stats ({PERIOD_LABELS[period].toLowerCase()})
          </h3>
          {habits.length === 0 ? (
            <p className="text-gray-500 text-sm">No habits yet.</p>
          ) : (
            <>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-extrabold text-white">{stats.pct}%</span>
                <span className="text-sm text-gray-400">
                  {stats.done} / {stats.total} completed
                </span>
              </div>
              <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${stats.pct}%` }} />
              </div>
            </>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mb-3">Tracker</h3>
        <div className="bg-[#121212] border border-[#303030] rounded-xl p-4">
          <h4 className="text-base font-semibold text-white mb-1">Habits</h4>
          {habits.length === 0 ? (
            <p className="text-gray-500 text-sm">No habits yet. Add one above.</p>
          ) : (
            <div className="flex flex-col gap-4 mt-3">
              {habits.map((h) => (
                <div key={h.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: h.color }} />
                    <span className="text-sm font-medium text-white">{h.name}</span>
                  </div>
                  <div className="flex gap-2">
                    {trackerDates.map((d) => {
                      const dateObj = new Date(d)
                      const dayOfWeek = dateObj.getDay()
                      const habitStart = new Date(h.created_at)
                      habitStart.setUTCHours(0, 0, 0, 0)
                      const checkDate = new Date(d)
                      checkDate.setUTCHours(0, 0, 0, 0)
                      const isScheduled =
                        (h.frequency ? h.frequency.includes(dayOfWeek) : true) && checkDate >= habitStart
                      const checked = !!(records[d] && records[d][h.id])
                      const bgColor = h.color || '#60a5fa'

                      return (
                        <button
                          key={d}
                          onClick={() => isScheduled && toggle(d, h.id)}
                          disabled={!isScheduled}
                          style={{
                            backgroundColor: isScheduled ? `${bgColor}30` : '#1a1a1a',
                            opacity: isScheduled ? 1 : 0.3,
                          }}
                          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg"
                        >
                          <span className="text-[10px] text-gray-400">
                            {dateObj.toLocaleDateString(undefined, { weekday: 'short' }).charAt(0)}
                          </span>
                          {isScheduled ? (
                            <Check
                              className="w-4 h-4"
                              style={{ color: checked ? bgColor : 'transparent' }}
                            />
                          ) : (
                            <div className="w-1 h-1 bg-gray-700 rounded-full" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddHabit onClose={() => setShowAdd(false)} onAdd={loadHabits} />}
    </div>
  )
}

export default MobileHabits
