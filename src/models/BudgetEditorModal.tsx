import React, { useEffect, useState } from 'react'
import { X, Wallet, Save, Copy } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Budget } from '../types/budget'
import type { TransactionCategory } from '../types/transaction'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Props = {
  month: number
  year: number
  categories: TransactionCategory[]
  budgets: Budget[] // all budgets, so the previous month's row can be found for "copy last month"
  onClose: () => void
  onSaved: (budget: Budget) => void
}

const BudgetEditorModal: React.FC<Props> = ({ month, year, categories, budgets, onClose, onSaved }) => {
  const existing = budgets.find((b) => b.month === month && b.year === year) ?? null
  const isEditing = existing !== null

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const previous = budgets.find((b) => b.month === prevMonth && b.year === prevYear) ?? null

  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      const initial: Record<string, string> = {}
      Object.entries(existing.category_budgets).forEach(([id, amount]) => { initial[id] = String(amount) })
      setAmounts(initial)
    } else {
      setAmounts({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  const handleCopyPrevious = () => {
    if (!previous) return
    const copied: Record<string, string> = {}
    Object.entries(previous.category_budgets).forEach(([id, amount]) => { copied[id] = String(amount) })
    setAmounts(copied)
  }

  const updateAmount = (categoryId: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [categoryId]: value }))
  }

  const handleSave = async () => {
    setError(null)

    const categoryBudgets: Record<string, number> = {}
    Object.entries(amounts).forEach(([id, value]) => {
      const n = Number(value)
      if (value.trim() !== '' && !Number.isNaN(n) && n > 0) categoryBudgets[id] = n
    })

    setSaving(true)

    const { data, error: saveError } = isEditing
      ? await supabase.from('budgets').update({ category_budgets: categoryBudgets }).match({ id: existing!.id }).select('*').single()
      : await supabase.from('budgets').insert([{ id: crypto.randomUUID(), month, year, category_budgets: categoryBudgets }]).select('*').single()

    setSaving(false)

    if (saveError) {
      console.error('Error saving budget:', saveError)
      setError('Could not save budget.')
      return
    }

    onSaved(data as Budget)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <Wallet className="w-5 h-5 text-gray-400" /> {MONTH_NAMES[month - 1]} {year} Budget
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!isEditing && previous && (
          <button
            onClick={handleCopyPrevious}
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#303030] text-sm text-gray-300 hover:text-white hover:border-gray-500 transition flex-shrink-0"
          >
            <Copy className="w-4 h-4" /> Copy from {MONTH_NAMES[prevMonth - 1]} {prevYear}
          </button>
        )}

        <div className="overflow-y-auto flex-1 -mr-2 pr-2 flex flex-col gap-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-300 truncate">{c.name}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amounts[c.id] ?? ''}
                onChange={(e) => updateAmount(c.id, e.target.value)}
                placeholder="0.00"
                className="w-32 bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white outline-none text-right"
              />
            </div>
          ))}
          {categories.length === 0 && <p className="text-gray-500 text-sm">No categories yet - add one from Transactions first.</p>}
        </div>

        {error && <p className="text-red-400 text-sm mt-4 flex-shrink-0">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#303030] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 shadow-lg shadow-white/5 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default BudgetEditorModal
