import type { Transaction } from '../types/transaction'
import { addDaysIST, todayIST } from './dateUtils'
import { netSpendEffect } from './linkedTransactions'

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

// Reserved key in category_budgets/byCategory for the "Repayment" budget line - repayments have
// no category_id of their own (AddTransaction.tsx never sets one for repayment types), so they'd
// otherwise be invisible to budgeting entirely (they aren't type === 'debit' either). Not a real
// transaction_categories id, so it can never collide with one.
export const REPAYMENT_BUDGET_KEY = '__repayment__'

// Reserved key for the "Loans" budget line: money you lend out (lend_out and its top-ups) leaves
// your account like spend but has no category, so it gets its own line. lend_in/lend_in_topup and
// repayment_received are money coming in, so they're excluded.
export const LOAN_BUDGET_KEY = '__loans__'
const isLoanOutflow = (type: string) => type === 'lend_out' || type === 'lend_out_topup'

// Sums spend in [start, effectiveEnd) by category_id, matching the same type === 'debit' filter
// TransactionDashboard.tsx's spending pie chart already uses, so budget "spent" always agrees
// with it. Uncategorized (null category_id) debit spend is bucketed separately. repayment_made
// transactions (paying back something you borrowed) are bucketed under REPAYMENT_BUDGET_KEY, and
// lend_out / lend_out_topup (money you lend) under LOAN_BUDGET_KEY -
// repayment_received is incoming money, not spend, so it's excluded entirely. A split_credit
// (a friend paying back their share of a group debit; it carries that debit's category) nets
// *against* that category's spend, so paying for the group and being reimbursed still shows your
// actual net spend. A plain credit is just income and never touches spend.
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
    if (t.transaction_date < start || t.transaction_date >= end) return
    const effect = netSpendEffect(t)
    if (effect !== 0) {
      if (t.category_id) byCategory[t.category_id] = (byCategory[t.category_id] ?? 0) + effect
      else uncategorized += effect
    } else if (t.type === 'repayment_made') {
      byCategory[REPAYMENT_BUDGET_KEY] = (byCategory[REPAYMENT_BUDGET_KEY] ?? 0) + t.amount
    } else if (isLoanOutflow(t.type)) {
      byCategory[LOAN_BUDGET_KEY] = (byCategory[LOAN_BUDGET_KEY] ?? 0) + t.amount
    }
  })

  return { byCategory, uncategorized }
}

// Reserved key for the "Uncategorized" row (debit/split spend with no category).
export const UNCATEGORIZED_BUDGET_KEY = '__uncategorized__'

// The transactions behind one budget row in a month, with what each contributes to that row's
// "spent" figure. Mirrors computeCategorySpend exactly (same month window, same netting), so the
// effects always add up to the number shown on the bar: debits (+), split credits (-), and for the
// Repayment row, repayments made (+).
export function transactionsForBudgetKey(
  transactions: Transaction[],
  key: string,
  month: number,
  year: number
): { transaction: Transaction; effect: number }[] {
  const { start } = monthRange(month, year)
  const end = effectiveMonthEnd(month, year)

  const rows: { transaction: Transaction; effect: number }[] = []
  transactions.forEach((t) => {
    if (t.transaction_date < start || t.transaction_date >= end) return
    if (key === REPAYMENT_BUDGET_KEY) {
      if (t.type === 'repayment_made') rows.push({ transaction: t, effect: t.amount })
      return
    }
    if (key === LOAN_BUDGET_KEY) {
      if (isLoanOutflow(t.type)) rows.push({ transaction: t, effect: t.amount })
      return
    }
    const effect = netSpendEffect(t)
    if (effect === 0) return
    const matches = key === UNCATEGORIZED_BUDGET_KEY ? !t.category_id : t.category_id === key
    if (matches) rows.push({ transaction: t, effect })
  })
  return rows.sort((a, b) =>
    a.transaction.transaction_date !== b.transaction.transaction_date
      ? (a.transaction.transaction_date < b.transaction.transaction_date ? 1 : -1)
      : (a.transaction.created_at < b.transaction.created_at ? 1 : -1)
  )
}

export type BudgetStatus ='green' | 'yellow' | 'red'

// red once overspent, yellow from 75% up to 100%, green below that. Single source of truth for
// both the per-category progress bar color and whether the over-budget summary banner shows.
export function budgetStatusColor(spent: number, budgeted: number): BudgetStatus {
  if (budgeted <= 0) return spent > 0 ? 'red' : 'green'
  const pct = spent / budgeted
  if (pct > 1) return 'red'
  if (pct >= 0.75) return 'yellow'
  return 'green'
}
