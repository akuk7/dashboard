import React from 'react'
import { X } from 'lucide-react'
import type { Transaction, TransactionAccount } from '../types/transaction'
import { typeBadge } from '../lib/transactionDisplay'
import { formatDisplayIST } from '../lib/dateUtils'

type Props = {
  title: string // "Food · November 2026"
  rows: { transaction: Transaction; effect: number }[]
  accounts: TransactionAccount[]
  onClose: () => void
}

// The transactions that make up one budget row for the viewed month (debits and split credits;
// repayments made for the Repayment row). Rows come from transactionsForBudgetKey, so the total
// here equals the "spent" figure on the bar.
const BudgetCategoryTransactionsModel: React.FC<Props> = ({ title, rows, accounts, onClose }) => {
  const total = rows.reduce((sum, r) => sum + r.effect, 0)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-[#303030]">
          <h3 className="text-lg font-bold text-white truncate">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-2">
          {rows.length === 0 && <p className="text-sm text-gray-500">No transactions in this category this month.</p>}
          {rows.map(({ transaction: t, effect }) => {
            const badge = typeBadge(t.type)
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#303030] bg-[#0E0E0E]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">{formatDisplayIST(t.transaction_date)} &middot; {accountName(t.account_id)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>
                  <span className={`text-sm font-bold w-20 text-right ${effect < 0 ? 'text-green-400' : 'text-white'}`}>
                    {effect < 0 ? '-' : ''}{Math.abs(effect).toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-[#303030] flex justify-between items-center">
          <span className="text-xs uppercase tracking-wider text-gray-500">Spent this month</span>
          <span className="text-lg font-bold text-white">{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default BudgetCategoryTransactionsModel
