import { useEffect, useMemo, useState } from 'react'
import { PlusCircle, Check, List, BarChart3, Pencil } from 'lucide-react'
import supabase from '../../lib/supabase'
import type { Habit } from '../../types/habit'
import AddHabit from '../../components/AddHabit'
import MobileHeader from '../MobileHeader'
import { addDaysIST, dayOfWeekIST, datesEndingTodayIST, todayIST, toISTDateString, weekdayLetterIST } from '../../lib/dateUtils'

type PeriodKeys = 'week' | 'month' | 'year'
const PERIOD_DAYS: Record<PeriodKeys, number> = { week: 7, month: 30, year: 365 }
const PERIOD_LABELS: Record<PeriodKeys, string> = { week: '7 Days', month: '30 Days', year: 'Year' }
const PERIOD_ORDER: PeriodKeys[] = ['week', 'month', 'year']
const TRACKER_DAYS = 5

type HabitRecordRow = { habit_id: string; date: string; done: boolean }

type ModalState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; habit: Habit }

const MobileHabits: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKeys>('week')
  const [habits, setHabits] = useState<Habit[]>([])
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>({})
  const [modalState, setModalState] = useState<ModalState>({ mode: 'closed' })
  const [view, setView] = useState<'list' | 'graph'>('list')

  const trackerDates = useMemo(() => datesEndingTodayIST(TRACKER_DAYS).reverse(), [])

  const loadHabits = async () => {
    const { data } = await supabase.from('habits').select('*').eq('active', true).order('created_at', { ascending: false })
    setHabits((data as Habit[]) || [])
  }

  useEffect(() => {
    loadHabits()
  }, [])

  useEffect(() => {
    const loadRecords = async () => {
      const dates = Array.from(new Set([...datesEndingTodayIST(PERIOD_DAYS[period]), ...trackerDates]))
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

  const statPerHabit = useMemo(() => {
    const today = todayIST()

    return habits.map((h) => {
      const habitStart = toISTDateString(h.created_at)
      const daysInPeriod = PERIOD_DAYS[period]
      const datesToCheck: string[] = []

      for (let i = 0; i < daysInPeriod; i++) {
        const d = addDaysIST(today, -i)
        if (d < habitStart) break
        datesToCheck.push(d)
      }

      const done = datesToCheck.reduce((acc, d) => {
        const dayOfWeek = dayOfWeekIST(d)
        const isScheduled = h.frequency ? h.frequency.includes(dayOfWeek) : true
        const isDone = records[d]?.[h.id]
        return acc + (isDone && isScheduled ? 1 : 0)
      }, 0)

      const total = datesToCheck.filter((d) => {
        const dayOfWeek = dayOfWeekIST(d)
        return h.frequency ? h.frequency.includes(dayOfWeek) : true
      }).length

      return { id: h.id, name: h.name, color: h.color, done, total }
    })
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
    <div className="w-full pb-24">
      <MobileHeader
        title="Habits"
        action={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#303030]">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md ${view === 'list' ? 'bg-[#303030] text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('graph')}
              className={`p-1.5 rounded-md ${view === 'graph' ? 'bg-[#303030] text-white' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {view === 'graph' ? (
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

          <div className="bg-[#121212] border border-[#303030] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Stats ({PERIOD_LABELS[period].toLowerCase()})
            </h3>
            {habits.length === 0 ? (
              <p className="text-gray-500 text-sm">No habits yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {statPerHabit.map((s) => {
                  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0
                  const color = s.color || '#60a5fa'
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-sm font-medium text-white truncate">{s.name}</span>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {s.done} / {s.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <h3 className="text-lg font-bold text-white mb-3">Tracker</h3>
          <div className="bg-[#121212] border border-[#303030] rounded-xl p-4">
            <h4 className="text-base font-semibold text-white mb-1">Habits</h4>
            {habits.length === 0 ? (
              <p className="text-gray-500 text-sm">No habits yet. Add one above.</p>
            ) : (
              <div className="flex flex-col gap-4 mt-3">
                {habits.map((h) => (
                  <div key={h.id}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: h.color }} />
                        <span className="text-sm font-medium text-white">{h.name}</span>
                      </div>
                      <button
                        onClick={() => setModalState({ mode: 'edit', habit: h })}
                        className="text-gray-500 hover:text-white"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {trackerDates.map((d) => {
                        const dayOfWeek = dayOfWeekIST(d)
                        const habitStart = toISTDateString(h.created_at)
                        const isScheduled = (h.frequency ? h.frequency.includes(dayOfWeek) : true) && d >= habitStart
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
                              {weekdayLetterIST(d)}
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
      )}

      <button
        onClick={() => setModalState({ mode: 'create' })}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {modalState.mode !== 'closed' && (
        <AddHabit
          habit={modalState.mode === 'edit' ? modalState.habit : null}
          onClose={() => setModalState({ mode: 'closed' })}
          onAdd={loadHabits}
          onDeactivated={loadHabits}
        />
      )}
    </div>
  )
}

export default MobileHabits
