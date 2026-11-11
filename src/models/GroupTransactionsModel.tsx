import React, { useEffect, useState } from 'react'
import { X, Luggage } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionGroup } from '../types/transaction'
import { AMOUNT_SIGN, typeBadge } from '../lib/transactionDisplay'
import { formatDisplayIST } from '../lib/dateUtils'

type Props = {
  group: TransactionGroup
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  onClose: () => void
}

// Every transaction attached to one group, loaded on open by the indexed group_id column.
const GroupTransactionsModel: React.FC<Props> = ({ group, accounts, categories, onClose }) => {
  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('transactions')
      .select('*')
      .eq('group_id', group.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error loading group transactions:', error)
          setFailed(true)
        } else {
          setRows((data as Transaction[]) ?? [])
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [group.id])

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown'
  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name : undefined)

  const spent = rows.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
  const received = rows.filter((t) => t.type === 'credit' || t.type === 'split_credit').reduce((s, t) => s + t.amount, 0)

  const range = [group.start_date, group.end_date].filter(Boolean).map((d) => formatDisplayIST(d as string)).join(' – ')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-start p-4 border-b border-[#303030] gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Luggage className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="truncate">{group.name}</span>
            </h3>
            {range && <p className="text-xs text-gray-500 mt-1">{range}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-2">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {failed && <p className="text-sm text-red-400">Could not load this group&apos;s transactions.</p>}
          {!loading && !failed && rows.length === 0 && (
            <p className="text-sm text-gray-500">No transactions in this group yet. Pick it when adding a debit, credit or split credit.</p>
          )}
          {rows.map((t) => {
            const badge = typeBadge(t.type)
            const category = categoryName(t.category_id)
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#303030] bg-[#0E0E0E]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatDisplayIST(t.transaction_date)} &middot; {accountName(t.account_id)}{category ? ` · ${category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>
                  <span className="text-sm font-bold text-white w-20 text-right">{AMOUNT_SIGN[t.type] ?? ''}{t.amount.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-[#303030] grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Spent</p>
            <p className="text-sm font-bold text-gray-300">{spent.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Received</p>
            <p className="text-sm font-bold text-gray-300">{received.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Net cost</p>
            <p className="text-sm font-bold text-white">{(spent - received).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupTransactionsModel
