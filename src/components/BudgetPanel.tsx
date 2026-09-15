import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Wallet, AlertTriangle } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Budget } from '../types/budget'
import type { Transaction, TransactionCategory } from '../types/transaction'
import { computeCategorySpend, budgetStatusColor, REPAYMENT_BUDGET_KEY } from '../lib/budgets'
import { todayIST } from '../lib/dateUtils'
import BudgetEditorModal from '../models/BudgetEditorModal'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const FLOOR_YEAR = 2026
const FLOOR_MONTH = 8
const UNCATEGORIZED_KEY = '__uncategorized__'

const STATUS_BAR_COLOR: Record<'green' | 'yellow' | 'red', string> = {
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
}

type Props = {
  categories: TransactionCategory[]
  transactions: Transaction[]
}

const BudgetPanel: React.FC<Props> = ({ categories, transactions }) => {
  const today = todayIST()
  const [viewMonth, setViewMonth] = useState(Number(today.slice(5, 7)))
  const [viewYear, setViewYear] = useState(Number(today.slice(0, 4)))
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [showEditor, setShowEditor] = useState(false)
  // Tracks which rows are excluded from the totals-above analysis (everything defaults to
  // included/checked; only ids added here are unchecked). Resets when you navigate months.
  const [uncheckedIds, setUncheckedIds] = useState<Set<string>>(new Set())

  const loadBudgets = async () => {
    const { data } = await supabase.from('budgets').select('*').order('year', { ascending: true }).order('month', { ascending: true })
    setBudgets((data as Budget[]) || [])
  }

  useEffect(() => {
    loadBudgets()
  }, [])

  useEffect(() => {
    setUncheckedIds(new Set())
  }, [viewMonth, viewYear])

  const categoriesById = useMemo(() => {
    const map: Record<string, TransactionCategory> = {}
    categories.forEach((c) => { map[c.id] = c })
    return map
  }, [categories])

  const resolveName = (id: string): string => {
    if (id === REPAYMENT_BUDGET_KEY) return 'Repayment'
    return categoriesById[id]?.name ?? 'Unknown'
  }

  const currentBudget = budgets.find((b) => b.month === viewMonth && b.year === viewYear) ?? null
  const spend = useMemo(() => computeCategorySpend(transactions, viewMonth, viewYear), [transactions, viewMonth, viewYear])

  const rows = useMemo(() => {
    const ids = new Set([
      ...Object.keys(currentBudget?.category_budgets ?? {}),
      ...Object.keys(spend.byCategory),
    ])
    return Array.from(ids)
      .map((id) => {
        const hasBudget = currentBudget ? id in currentBudget.category_budgets : false
        const budgeted = currentBudget?.category_budgets[id] ?? 0
        const spentAmt = spend.byCategory[id] ?? 0
        return {
          id,
          name: resolveName(id),
          budgeted,
          spent: spentAmt,
          hasBudget,
          status: hasBudget ? budgetStatusColor(spentAmt, budgeted) : null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBudget, spend, categoriesById])

  const totalBudgeted = useMemo(
    () => rows.filter((r) => !uncheckedIds.has(r.id)).reduce((sum, r) => sum + r.budgeted, 0),
    [rows, uncheckedIds]
  )
  const totalSpent = useMemo(() => {
    const fromRows = rows.filter((r) => !uncheckedIds.has(r.id)).reduce((sum, r) => sum + r.spent, 0)
    const uncategorizedIncluded = uncheckedIds.has(UNCATEGORIZED_KEY) ? 0 : spend.uncategorized
    return fromRows + uncategorizedIncluded
  }, [rows, uncheckedIds, spend])
  const remaining = totalBudgeted - totalSpent
  const overBudgetCount = rows.filter((r) => r.hasBudget && r.status === 'red').length

  const isPrevDisabled = viewYear === FLOOR_YEAR && viewMonth === FLOOR_MONTH

  const goPrevMonth = () => {
    if (isPrevDisabled) return
    setViewMonth((m) => (m === 1 ? 12 : m - 1))
    setViewYear((y) => (viewMonth === 1 ? y - 1 : y))
  }

  const goNextMonth = () => {
    setViewMonth((m) => (m === 12 ? 1 : m + 1))
    setViewYear((y) => (viewMonth === 12 ? y + 1 : y))
  }

  const handleBudgetSaved = (budget: Budget) => {
    setBudgets((prev) => {
      const exists = prev.some((b) => b.id === budget.id)
      return exists ? prev.map((b) => (b.id === budget.id ? budget : b)) : [...prev, budget]
    })
  }

  const toggleChecked = (id: string) => {
    setUncheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 border border-[#303030] shadow-md rounded-xl text-gray-100 mt-6">
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-[#303030] pb-3 gap-3">
        <h4 className="text-xl font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-gray-400" /> Budget
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrevMonth}
              disabled={isPrevDisabled}
              className="p-1.5 rounded-lg bg-[#121212] border border-[#303030] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-300 w-32 text-center">{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
            <button
              onClick={goNextMonth}
              className="p-1.5 rounded-lg bg-[#121212] border border-[#303030] text-gray-300 hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="px-3 py-2 rounded-lg bg-[#121212] text-gray-300 hover:bg-[#303030] transition border border-[#303030] text-sm"
          >
            {currentBudget ? 'Edit Budget' : 'Set Budget'}
          </button>
        </div>
      </div>

      {!currentBudget ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-3">No budget set for {MONTH_NAMES[viewMonth - 1]} {viewYear}.</p>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium"
          >
            Set Budget
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
              <p className="text-xs text-gray-500 mb-1">Total Budgeted</p>
              <p className="text-lg font-bold text-white">{totalBudgeted.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
              <p className="text-xs text-gray-500 mb-1">Total Spent</p>
              <p className="text-lg font-bold text-red-400">{totalSpent.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-[#121212] rounded-xl border border-white/40">
              <p className="text-xs text-gray-500 mb-1">Remaining</p>
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>{remaining.toFixed(2)}</p>
            </div>
          </div>

          {overBudgetCount > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {overBudgetCount} categor{overBudgetCount === 1 ? 'y is' : 'ies are'} over budget this month
            </div>
          )}

          <div className="flex flex-col gap-3">
            {rows.map((r) => {
              const pct = r.hasBudget && r.budgeted > 0 ? Math.min(100, (r.spent / r.budgeted) * 100) : 0
              const multiplier = r.hasBudget && r.budgeted > 0 ? `${(r.spent / r.budgeted).toFixed(2)}x` : null
              const checked = !uncheckedIds.has(r.id)
              return (
                <div key={r.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChecked(r.id)}
                    className="mt-1.5 shrink-0"
                    title="Include in totals above"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 text-sm gap-2">
                      <span className="text-gray-300">{r.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-400">
                          {r.hasBudget ? `${r.spent.toFixed(2)} / ${r.budgeted.toFixed(2)}` : `${r.spent.toFixed(2)} · No budget set`}
                        </span>
                        {multiplier && (
                          <span className={`text-xs font-semibold w-12 text-right ${STATUS_BAR_COLOR[r.status!] === STATUS_BAR_COLOR.red ? 'text-red-400' : 'text-gray-500'}`}>
                            {multiplier}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#0A0A0A] border border-[#303030] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: r.hasBudget ? `${pct}%` : '100%',
                          backgroundColor: r.hasBudget ? STATUS_BAR_COLOR[r.status!] : STATUS_BAR_COLOR.red,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {spend.uncategorized > 0 && (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={!uncheckedIds.has(UNCATEGORIZED_KEY)}
                  onChange={() => toggleChecked(UNCATEGORIZED_KEY)}
                  className="mt-1.5 shrink-0"
                  title="Include in totals above"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-gray-300">Uncategorized</span>
                    <span className="text-gray-400">{spend.uncategorized.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-[#0A0A0A] border border-[#303030] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: STATUS_BAR_COLOR.red }} />
                  </div>
                </div>
              </div>
            )}
            {rows.length === 0 && spend.uncategorized === 0 && (
              <p className="text-gray-500 text-sm">No spending yet this month.</p>
            )}
          </div>
        </>
      )}

      {showEditor && (
        <BudgetEditorModal
          month={viewMonth}
          year={viewYear}
          categories={categories}
          budgets={budgets}
          onClose={() => setShowEditor(false)}
          onSaved={handleBudgetSaved}
        />
      )}
    </div>
  )
}

export default BudgetPanel
