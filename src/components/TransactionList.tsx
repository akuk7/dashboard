import React, { useMemo, useState } from 'react'
import { Trash2, Edit, ArrowLeftRight, HandCoins, TrendingUp, PlusCircle, Search, Link2, Split } from 'lucide-react'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../types/transaction'
import type { LoanInfo } from '../lib/loans'
import { formatDisplayIST, startOfMonthIST, todayIST } from '../lib/dateUtils'
import { AMOUNT_SIGN, typeBadge } from '../lib/transactionDisplay'

type TypeFilter = 'non_transfer' | 'all' | TransactionType

// Picking any of these in the Type filter jumps the date range to cover the full lending history
// (31 Jul 2026, the day before any loan data exists) through today, instead of the usual
// start-of-month default - otherwise an old loan/repayment would silently fall outside the range.
const LEND_RELATED_TYPES = new Set<TransactionType>([
  'lend_out', 'lend_in', 'lend_out_topup', 'lend_in_topup', 'repayment_received', 'repayment_made',
])

type Props = {
  transactions: Transaction[]
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  lendOutLoans: LoanInfo[]
  lendInLoans: LoanInfo[]
  onAdd: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onRepay: (loan: Transaction) => void
  onTopup: (loan: Transaction) => void
  onSplit: (debit: Transaction) => void
  onShowLinked: (parentId: string) => void
}

const TransactionList: React.FC<Props> = ({ transactions, accounts, categories, lendOutLoans, lendInLoans, onAdd, onEdit, onDelete, onRepay, onTopup, onSplit, onShowLinked }) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('non_transfer')
  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fromDate, setFromDate] = useState(startOfMonthIST())
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')

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
    const query = search.trim().toLowerCase()
    return transactions.filter(t => {
      if (typeFilter === 'non_transfer' && t.type === 'internal_transfer') return false
      if (typeFilter !== 'non_transfer' && typeFilter !== 'all' && t.type !== typeFilter) return false
      if (accountFilter !== 'all' && t.account_id !== accountFilter && t.to_account_id !== accountFilter) return false
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false
      if (fromDate && t.transaction_date < fromDate) return false
      if (toDate && t.transaction_date > toDate) return false
      if (query && !t.description.toLowerCase().includes(query)) return false
      return true
    })
  }, [transactions, typeFilter, accountFilter, categoryFilter, fromDate, toDate, search])

  const handleTypeFilterChange = (value: TypeFilter) => {
    setTypeFilter(value)
    if (LEND_RELATED_TYPES.has(value as TransactionType)) {
      setFromDate('2026-07-31')
      setToDate(todayIST())
    }
  }

  return (
    <div className="p-6 border border-[#303030] shadow-md rounded-xl text-gray-100 mt-6">
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-[#303030] pb-3 gap-3">
        <div className="flex items-center gap-3">
          <h4 className="text-xl font-bold text-white">History ({filtered.length})</h4>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-lg font-medium text-sm"
          >
            <PlusCircle size={16} /> Add Transaction
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description..."
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg pl-8 pr-3 py-1 text-sm text-gray-300 w-44"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilterChange(e.target.value as TypeFilter)}
            className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300"
          >
            <option value="non_transfer">Exclude Transfers</option>
            <option value="all">All Types</option>
            <option value="debit">Debit Only</option>
            <option value="credit">Credit Only</option>
            <option value="split_credit">Split Credits</option>
            <option value="lend_out">Lent Out Only</option>
            <option value="lend_in">Lent In Only</option>
            <option value="lend_out_topup">Lend Out Top-ups</option>
            <option value="lend_in_topup">Lend In Top-ups</option>
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
              <div
                className={`flex items-center gap-3 min-w-0 ${t.linked_count > 0 || t.related_transaction_id ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  const target = t.linked_count > 0 ? t.id : t.related_transaction_id
                  if (target) onShowLinked(target)
                }}
              >
                {t.type === 'internal_transfer' && <ArrowLeftRight className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{t.description}</p>
                    {t.linked_count > 0 && (
                      <button
                        onClick={() => onShowLinked(t.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-300 border border-[#303030] rounded-full px-1.5 py-0.5 hover:text-white hover:border-white shrink-0"
                        title="View linked payments"
                      >
                        <Link2 className="w-3 h-3" /> {t.linked_count}
                      </button>
                    )}
                    {t.related_transaction_id && (
                      <button
                        onClick={() => onShowLinked(t.related_transaction_id as string)}
                        className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-white shrink-0"
                        title="View the transaction this is linked to"
                      >
                        <Link2 className="w-3 h-3" /> linked
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDisplayIST(t.transaction_date)} &middot; {accountsById[t.account_id] ?? 'Unknown'}
                    {t.type === 'internal_transfer' && t.to_account_id
                      ? ` → ${accountsById[t.to_account_id] ?? 'Unknown'}`
                      : ''}
                    {t.category_id ? ` · ${categoriesById[t.category_id] ?? ''}` : ''}
                    {t.is_temporary && (t.type === 'lend_out' || t.type === 'lend_in') ? ' · Temporary' : ''}
                    {(t.type === 'lend_out' || t.type === 'lend_in') && outstandingByLoanId[t.id] !== undefined
                      ? ` · ${t.amount.toFixed(2)} original`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                {(t.type === 'lend_out' || t.type === 'lend_in') && outstandingByLoanId[t.id] !== undefined ? (
                  <span className="w-28 text-right">
                    <span className="block text-lg font-bold text-white leading-tight">
                      {AMOUNT_SIGN[t.type] ?? ''}{outstandingByLoanId[t.id].toFixed(2)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500">outstanding</span>
                  </span>
                ) : (
                  <span className="text-sm font-bold text-white w-24 text-right">
                    {AMOUNT_SIGN[t.type] ?? ''}{t.amount.toFixed(2)}
                  </span>
                )}
                {t.type === 'debit' && (
                  <button
                    onClick={() => onSplit(t)}
                    className="text-gray-600 hover:text-emerald-400 p-1 rounded-full transition"
                    title="Add a split credit (someone paid back their share)"
                  >
                    <Split className="w-4 h-4" />
                  </button>
                )}
                {(t.type === 'lend_out' || t.type === 'lend_in') && (
                  <button
                    onClick={() => onTopup(t)}
                    className="text-gray-600 hover:text-amber-400 p-1 rounded-full transition"
                    title="Add to this loan"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                )}
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
