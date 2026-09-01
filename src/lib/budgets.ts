import type { Transaction } from '../types/transaction'
import { addDaysIST, todayIST } from './dateUtils'

const pad2 = (n: number): string => String(n).padStart(2, '0')

// Calendar range for a given (month, year): start = YYYY-MM-01, end = exclusive upper bound (the
// 1st of the following month - handles December -> January rollover with plain integer math,
// no date-object arithmetic needed since budgets are keyed by month/year integers, not dates).
export function monthRange(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${pad2(month)}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${pad2(nextMonth)}-01`
  return { start, end }
}

// Same as monthRange().end, except for the currently active IST month, where it's "today + 1
// day" instead - this is what makes "spent so far" mean "up to today" for the current month
// while still showing the full month for past ones.
export function effectiveMonthEnd(month: number, year: number): string {
  const { end } = monthRange(month, year)
  const today = todayIST()
  const isCurrentMonth = month === Number(today.slice(5, 7)) && year === Number(today.slice(0, 4))
  return isCurrentMonth ? addDaysIST(today, 1) : end
}

// Sums debit transactions in [start, effectiveEnd) by category_id, matching the same
// type === 'debit' filter TransactionDashboard.tsx's spending pie chart already uses, so budget
// "spent" always agrees with it. Uncategorized (null category_id) spend is bucketed separately.
export function computeCategorySpend(
  transactions: Transaction[],
  month: number,
  year: number
): { byCategory: Record<string, number>; uncategorized: number } {
  const { start } = monthRange(month, year)
  const end = effectiveMonthEnd(month, year)

  const byCategory: Record<string, number> = {}
  let uncategorized = 0

  transactions.forEach((t) => {
    if (t.type !== 'debit') return
    if (t.transaction_date < start || t.transaction_date >= end) return
    if (t.category_id) byCategory[t.category_id] = (byCategory[t.category_id] ?? 0) + t.amount
    else uncategorized += t.amount
  })

  return { byCategory, uncategorized }
}

export type BudgetStatus = 'green' | 'yellow' | 'red'

// red once overspent, yellow from 75% up to 100%, green below that. Single source of truth for
// both the per-category progress bar color and whether the over-budget summary banner shows.
export function budgetStatusColor(spent: number, budgeted: number): BudgetStatus {
  if (budgeted <= 0) return spent > 0 ? 'red' : 'green'
  const pct = spent / budgeted
  if (pct > 1) return 'red'
  if (pct >= 0.75) return 'yellow'
  return 'green'
}
