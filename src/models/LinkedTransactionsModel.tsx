import React, { useEffect, useState } from 'react'
import { X, Link2 } from 'lucide-react'
import type { TransactionAccount } from '../types/transaction'
import { fetchLinkedGroup, summarizeGroup } from '../lib/linkedTransactions'
import type { LinkedGroup } from '../lib/linkedTransactions'
import { AMOUNT_SIGN, typeBadge } from '../lib/transactionDisplay'
import { formatDisplayIST } from '../lib/dateUtils'

type Props = {
  parentId: string
  accounts: TransactionAccount[]
  onClose: () => void
}

// Shows a parent transaction (a loan, or a debit with split credits) together with everything
// linked to it, loaded on open so it never depends on the full transaction list being in memory.
const LinkedTransactionsModel: React.FC<Props> = ({ parentId, accounts, onClose }) => {
  const [group, setGroup] = useState<LinkedGroup | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchLinkedGroup(parentId).then((g) => {
      if (cancelled) return
      setGroup(g)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [parentId])

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown'
  const rows = group ? [group.parent, ...group.children] : []

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-[#303030]">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white min-w-0">
            <Link2 className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="truncate">{group?.parent.description ?? 'Linked transactions'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-2">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {!loading && !group && <p className="text-sm text-red-400">Could not load linked transactions.</p>}
          {rows.map((t, i) => {
            const badge = typeBadge(t.type)
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${i === 0 ? 'border-white/30 bg-[#161616]' : 'border-[#303030] bg-[#0E0E0E] ml-4'}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">{formatDisplayIST(t.transaction_date)} &middot; {accountName(t.account_id)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>
                  <span className="text-sm font-bold text-white w-20 text-right">{AMOUNT_SIGN[t.type] ?? ''}{t.amount.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {group && (
          <div className="p-4 border-t border-[#303030] grid grid-cols-3 gap-2 text-center">
            {summarizeGroup(group).map((s) => (
              <div key={s.label}>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className={`text-sm font-bold ${s.emphasis ? 'text-white' : 'text-gray-300'}`}>{s.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LinkedTransactionsModel
