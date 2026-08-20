import React, { useMemo, useState } from 'react'
import { Trash2, Edit, ArrowLeftRight, HandCoins } from 'lucide-react'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../types/transaction'
import type { LoanInfo } from '../lib/loans'

type TypeFilter = 'non_transfer' | 'all' | TransactionType

type Props = {
  transactions: Transaction[]
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  lendOutLoans: LoanInfo[]
  lendInLoans: LoanInfo[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onRepay: (loan: Transaction) => void
}

const typeBadge = (type: TransactionType) => {
  if (type === 'credit') return { label: 'Credit', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  if (type === 'debit') return { label: 'Debit', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
  if (type === 'lend_out') return { label: 'Lent Out', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' }
  if (type === 'lend_in') return { label: 'Lent In', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' }
  if (type === 'repayment_received') return { label: 'Repayment Received', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  if (type === 'repayment_made') return { label: 'Repayment Made', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
  return { label: 'Transfer', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' }
}

const AMOUNT_SIGN: Partial<Record<TransactionType, '-' | '+'>> = {
  debit: '-',
  lend_out: '-',
  repayment_made: '-',
  credit: '+',
  lend_in: '+',
  repayment_received: '+',
}

const TransactionList: React.FC<Props> = ({ transactions, accounts, categories, lendOutLoans, lendInLoans, onEdit, onDelete, onRepay }) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('non_transfer')
  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const accountsById = useMemo(() => {
    const map: Record<string, string> = {}
    accounts.forEach(a => { map[a.id] = a.name })
    return map
  }, [accounts])

  const categoriesById = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach(c => { map[c.id] = c.name })
    return map
  }, [categories])

  const outstandingByLoanId = useMemo(() => {
    const map: Record<string, number> = {}
    ;[...lendOutLoans, ...lendInLoans].forEach(l => { map[l.transaction.id] = l.outstanding })
    return map
  }, [lendOutLoans, lendInLoans])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter === 'non_transfer' && t.type === 'internal_transfer') return false
      if (typeFilter !== 'non_transfer' && typeFilter !== 'all' && t.type !== typeFilter) return false
      if (accountFilter !== 'all' && t.account_id !== accountFilter && t.to_account_id !== accountFilter) return false
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false
      if (fromDate && t.transaction_date < fromDate) return false
      if (toDate && t.transaction_date > toDate) return false
      return true
    })
  }, [transactions, typeFilter, accountFilter, categoryFilter, fromDate, toDate])

  return (
    <div className="p-6 border border-[#303030] shadow-md rounded-xl text-gray-100 mt-6">
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-[#303030] pb-3 gap-3">
        <h4 className="text-xl font-bold text-white">History ({filtered.length})</h4>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300"
          >
            <option value="non_transfer">Exclude Transfers</option>
            <option value="all">All Types</option>
            <option value="debit">Debit Only</option>
            <option value="credit">Credit Only</option>
            <option value="lend_out">Lent Out Only</option>
            <option value="lend_in">Lent In Only</option>
            <option value="repayment_received">Repayments Received</option>
            <option value="repayment_made">Repayments Made</option>
            <option value="internal_transfer">Transfers Only</option>
          </select>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300"
          >
            <option value="all">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-sm text-gray-300"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-sm text-gray-300"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
        {filtered.map(t => {
          const badge = typeBadge(t.type)
          return (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 bg-[#121212] rounded-lg border border-[#303030] transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                {t.type === 'internal_transfer' && <ArrowLeftRight className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {t.transaction_date} &middot; {accountsById[t.account_id] ?? 'Unknown'}
                    {t.type === 'internal_transfer' && t.to_account_id
                      ? ` → ${accountsById[t.to_account_id] ?? 'Unknown'}`
                      : ''}
                    {t.category_id ? ` · ${categoriesById[t.category_id] ?? ''}` : ''}
                    {t.is_temporary && (t.type === 'lend_out' || t.type === 'lend_in') ? ' · Temporary' : ''}
                    {(t.type === 'lend_out' || t.type === 'lend_in') && outstandingByLoanId[t.id] !== undefined
                      ? ` · ${outstandingByLoanId[t.id].toFixed(2)} outstanding`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-sm font-bold text-white w-24 text-right">
                  {AMOUNT_SIGN[t.type] ?? ''}{t.amount.toFixed(2)}
                </span>
                {(t.type === 'lend_out' || t.type === 'lend_in') && (outstandingByLoanId[t.id] ?? 0) > 0.001 && (
                  <button
                    onClick={() => onRepay(t)}
                    className="text-gray-600 hover:text-green-400 p-1 rounded-full transition"
                    title="Record repayment"
                  >
                    <HandCoins className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onEdit(t)}
                  className="text-gray-600 hover:text-white p-1 rounded-full transition"
                  title="Edit transaction"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="text-gray-600 hover:text-red-500 p-1 rounded-full transition"
                  title="Delete transaction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-gray-400 mt-2">No transactions match these filters.</p>
        )}
      </div>
    </div>
  )
}

export default TransactionList
