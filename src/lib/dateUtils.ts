// All "today"/week-boundary calculations for Habits and Todo are anchored to IST (UTC+5:30),
// regardless of the browser's local timezone or Supabase's UTC storage.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// IST calendar date (YYYY-MM-DD) for a given Date object or ISO/date-only string.
export function toISTDateString(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const shifted = new Date(d.getTime() + IST_OFFSET_MS)
  return shifted.toISOString().split('T')[0]
}

// IST calendar date string for right now.
export function todayIST(): string {
  return toISTDateString(new Date())
}

// Day of week (0=Sun..6=Sat) for an IST calendar date string.
export function dayOfWeekIST(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay()
}

// Adds/subtracts whole days from an IST calendar date string.
export function addDaysIST(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().split('T')[0]
}

// Whole-day difference (a - b) between two IST calendar date strings.
export function diffDaysIST(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime()
  const db = new Date(`${b}T00:00:00Z`).getTime()
  return Math.round((da - db) / 86400000)
}

// Monday-anchored start of week for an IST calendar date string (defaults to today).
export function startOfWeekIST(dateStr: string = todayIST()): string {
  const day = dayOfWeekIST(dateStr) // 0=Sun..6=Sat
  const diffFromMonday = (day + 6) % 7 // Mon=0 ... Sun=6
  return addDaysIST(dateStr, -diffFromMonday)
}

// `days` IST calendar dates ending today, newest first: [today, today-1, ..., today-(days-1)].
export function datesEndingTodayIST(days: number): string[] {
  const today = todayIST()
  const res: string[] = []
  for (let i = 0; i < days; i++) res.push(addDaysIST(today, -i))
  return res
}

// Day-of-month for a YYYY-MM-DD string, read directly (no Date object / timezone involved).
export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(-2))
}

// Single-letter weekday label for a YYYY-MM-DD string, evaluated in IST.
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export function weekdayLetterIST(dateStr: string): string {
  return WEEKDAY_LETTERS[dayOfWeekIST(dateStr)]
}

// Display formatting (DD/MM/YYYY) for a date-only or ISO timestamp string, using its IST calendar date.
export function formatDisplayIST(input: string): string {
  const dateStr = input.length <= 10 ? input : toISTDateString(input)
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
