import { useEffect, useMemo, useState } from 'react'
import { PlusCircle, List, BarChart3, SlidersHorizontal, Edit, Trash2, HandCoins, ArrowLeftRight } from 'lucide-react'
import supabase from '../../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../../types/transaction'
import { getLoansWithOutstanding } from '../../lib/loans'
import AddTransaction from '../../components/AddTransaction'
import MobileHeader from '../MobileHeader'
import MobileTransactionAnalytics from './MobileTransactionAnalytics'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create'; prefill?: Partial<Transaction> }
  | { mode: 'edit'; transaction: Transaction }

type TypeFilter = 'non_transfer' | 'all' | TransactionType

const typeBadge = (type: TransactionType) => {
  if (type === 'credit') return { label: 'Credit', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  if (type === 'debit') return { label: 'Debit', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
  if (type === 'lend_out') return { label: 'Lent Out', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' }
  if (type === 'lend_in') return { label: 'Lent In', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' }
  if (type === 'repayment_received') return { label: 'Repaid', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  if (type === 'repayment_made') return { label: 'Repaid', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
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

// Matches the DB query order (transaction_date desc, created_at desc) - keeps the list sorted by
// when the transaction happened, not when the row was inserted/edited.
const sortTransactions = (list: Transaction[]): Transaction[] =>
  [...list].sort((a, b) => {
    if (a.transaction_date !== b.transaction_date) return a.transaction_date < b.transaction_date ? 1 : -1
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  })

const MobileTransactions: React.FC = () => {
  const [accounts, setAccounts] = useState<TransactionAccount[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [view, setView] = useState<'list' | 'graph'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [editorState, setEditorState] = useState<EditorState>({ mode: 'closed' })

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('non_transfer')
  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const lendOutLoans = useMemo(() => getLoansWithOutstanding(transactions, 'lend_out'), [transactions])
  const lendInLoans = useMemo(() => getLoansWithOutstanding(transactions, 'lend_in'), [transactions])

  const loadData = async () => {
    const [{ data: accData }, { data: catData }, { data: txnData }] = await Promise.all([
      supabase.from('transaction_accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('transaction_categories').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setAccounts((accData as TransactionAccount[]) || [])
    setCategories((catData as TransactionCategory[]) || [])
    setTransactions((txnData as Transaction[]) || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const accountsById = useMemo(() => {
    const map: Record<string, string> = {}
    accounts.forEach((a) => {
      map[a.id] = a.name
    })
    return map
  }, [accounts])

  const categoriesById = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((c) => {
      map[c.id] = c.name
    })
    return map
  }, [categories])

  const outstandingByLoanId = useMemo(() => {
    const map: Record<string, number> = {}
    ;[...lendOutLoans, ...lendInLoans].forEach((l) => {
      map[l.transaction.id] = l.outstanding
    })
    return map
  }, [lendOutLoans, lendInLoans])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter === 'non_transfer' && t.type === 'internal_transfer') return false
      if (typeFilter !== 'non_transfer' && typeFilter !== 'all' && t.type !== typeFilter) return false
      if (accountFilter !== 'all' && t.account_id !== accountFilter && t.to_account_id !== accountFilter) return false
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false
      if (fromDate && t.transaction_date < fromDate) return false
      if (toDate && t.transaction_date > toDate) return false
      return true
    })
  }, [transactions, typeFilter, accountFilter, categoryFilter, fromDate, toDate])

  const handleTransactionSaved = (t: Transaction) => {
    setTransactions((prev) => {
      const exists = prev.some((x) => x.id === t.id)
      const next = exists ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev]
      return sortTransactions(next)
    })
    setEditorState({ mode: 'closed' })
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().match({ id })
    if (error) {
      console.error('Error deleting transaction:', error)
      return
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const handleRepay = (loan: Transaction) => {
    const repaymentType: TransactionType = loan.type === 'lend_out' ? 'repayment_received' : 'repayment_made'
    const loans = loan.type === 'lend_out' ? lendOutLoans : lendInLoans
    const outstanding = loans.find((l) => l.transaction.id === loan.id)?.outstanding ?? loan.amount

    setEditorState({
      mode: 'create',
      prefill: {
        type: repaymentType,
        account_id: loan.account_id,
        amount: Math.max(0, outstanding),
        description: `Repayment: ${loan.description}`,
        repays_transaction_id: loan.id,
      },
    })
  }

  return (
    <div className="w-full pb-24">
      <MobileHeader
        title="Transactions"
        action={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#303030]">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md ${view === 'list' ? 'bg-[#303030] text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('graph')}
              className={`p-1.5 rounded-md ${view === 'graph' ? 'bg-[#303030] text-white' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {view === 'graph' ? (
        <MobileTransactionAnalytics
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          lendOutLoans={lendOutLoans}
          lendInLoans={lendInLoans}
        />
      ) : (
        <div className="px-4 pt-4">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 mb-3 text-sm text-gray-300 border border-[#303030] rounded-lg px-3 py-2 bg-[#121212]"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters {showFilters ? '▲' : '▼'}
          </button>

          {showFilters && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="col-span-2 bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
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
                className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2 text-sm text-gray-300"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filtered.map((t) => {
              const badge = typeBadge(t.type)
              return (
                <div key={t.id} className="p-3 bg-[#121212] rounded-lg border border-[#303030]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      {t.type === 'internal_transfer' && (
                        <ArrowLeftRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-white truncate">{t.description}</p>
                    </div>
                    <span
                      className={`text-sm font-bold flex-shrink-0 ${
                        AMOUNT_SIGN[t.type] === '-' ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {AMOUNT_SIGN[t.type] ?? ''}
                      {t.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
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
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <div className="flex items-center gap-3">
                      {(t.type === 'lend_out' || t.type === 'lend_in') && (outstandingByLoanId[t.id] ?? 0) > 0.001 && (
                        <button onClick={() => handleRepay(t)} className="text-gray-500 hover:text-green-400">
                          <HandCoins className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditorState({ mode: 'edit', transaction: t })}
                        className="text-gray-500 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-gray-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="text-gray-500 text-center mt-10">No transactions match these filters.</p>}
          </div>
        </div>
      )}

      <button
        onClick={() => setEditorState({ mode: 'create' })}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {editorState.mode !== 'closed' && (
        <AddTransaction
          transaction={editorState.mode === 'edit' ? editorState.transaction : null}
          prefill={editorState.mode === 'create' ? editorState.prefill : undefined}
          accounts={accounts}
          categories={categories}
          lendOutLoans={lendOutLoans}
          lendInLoans={lendInLoans}
          onClose={() => setEditorState({ mode: 'closed' })}
          onSave={handleTransactionSaved}
        />
      )}
    </div>
  )
}

export default MobileTransactions
