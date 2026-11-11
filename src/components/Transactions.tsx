import { useState, useEffect, useMemo } from 'react'
import { PlusCircle, Wallet, LayoutDashboard, List, PiggyBank, Luggage } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../types/transaction'
import { getLoansWithOutstanding } from '../lib/loans'
import { adjustLinkedCount } from '../lib/linkedTransactions'
import LinkedTransactionsModel from '../models/LinkedTransactionsModel'
import TransactionGroups from './TransactionGroups'
import AddTransaction from './AddTransaction'
import AccountModal from '../models/AccountModel'
import TransactionCategoryModal from '../models/TransactionCategoryModel'
import TransactionDashboard from './TransactionDashboard'
import TransactionList from './TransactionList'
import BudgetPanel from './BudgetPanel'
import { useRecordCreated } from '../lib/chat/useRecordCreated'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create'; prefill?: Partial<Transaction> }
  | { mode: 'edit'; transaction: Transaction }

// Matches the DB query order (transaction_date desc, created_at desc) - keeps the list sorted by
// when the transaction happened, not when the row was inserted/edited.
const sortTransactions = (list: Transaction[]): Transaction[] =>
  [...list].sort((a, b) => {
    if (a.transaction_date !== b.transaction_date) return a.transaction_date < b.transaction_date ? 1 : -1
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  })

type Section = 'dashboard' | 'history' | 'budget' | 'groups'

const SECTIONS: { id: Section; label: string; icon: typeof Wallet }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: List },
  { id: 'budget', label: 'Budget', icon: PiggyBank },
  { id: 'groups', label: 'Groups', icon: Luggage },
]

const SECTION_STORAGE_KEY = 'transactions:section'

// Remembers the last section across reloads; storage can be unavailable, so it's best-effort.
const loadSection = (): Section => {
  try {
    const saved = localStorage.getItem(SECTION_STORAGE_KEY)
    if (SECTIONS.some(s => s.id === saved)) return saved as Section
  } catch { /* ignore */ }
  return 'dashboard'
}

const Transactions: React.FC = () => {
  const [section, setSection] = useState<Section>(loadSection)
  const changeSection = (next: Section) => {
    setSection(next)
    try { localStorage.setItem(SECTION_STORAGE_KEY, next) } catch { /* ignore */ }
  }

  const [accounts, setAccounts] = useState<TransactionAccount[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editorState, setEditorState] = useState<EditorState>({ mode: 'closed' })
  const [linkedParentId, setLinkedParentId] = useState<string | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)

  const lendOutLoans = useMemo(() => getLoansWithOutstanding(transactions, 'lend_out'), [transactions])
  const lendInLoans = useMemo(() => getLoansWithOutstanding(transactions, 'lend_in'), [transactions])

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    const [{ data: accData }, { data: catData }, { data: txnData }] = await Promise.all([
      supabase.from('transaction_accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('transaction_categories').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setAccounts((accData as TransactionAccount[]) || [])
    setCategories((catData as TransactionCategory[]) || [])
    setTransactions((txnData as Transaction[]) || [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useRecordCreated(['transaction'], () => { void loadData(true) })

  const handleTransactionSaved = (transaction: Transaction) => {
    setTransactions(prev => {
      const previous = prev.find(t => t.id === transaction.id)
      // The returned row has no trigger-updated count for itself if it's also a parent - keep ours.
      const saved = previous ? { ...transaction, linked_count: previous.linked_count } : transaction
      const next = previous ? prev.map(t => (t.id === transaction.id ? saved : t)) : [saved, ...prev]
      return sortTransactions(adjustLinkedCount(next, previous?.related_transaction_id, transaction.related_transaction_id))
    })
    setEditorState({ mode: 'closed' })
  }

  const handleCreateAccount = async (name: string, openingBalance: number) => {
    const { data, error } = await supabase
      .from('transaction_accounts')
      .insert([{ name, opening_balance: openingBalance }])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating account:', error)
      alert('Could not create account (name may already exist).')
      return
    }

    setAccounts(prev => [...prev, data as TransactionAccount])
    setShowAddAccount(false)
  }

  const handleCreateCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('transaction_categories')
      .insert([{ name }])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating category:', error)
      alert('Could not create category (name may already exist).')
      return
    }

    setCategories(prev => [...prev, data as TransactionCategory])
    setShowAddCategory(false)
  }

  const handleDeleteTransaction = async (id: string) => {
    const target = transactions.find(t => t.id === id)
    if (target && target.linked_count > 0) {
      alert('This transaction has linked payments (repayments, top-ups or splits). Delete those first.')
      return
    }
    const { error } = await supabase.from('transactions').delete().match({ id })
    if (error) {
      console.error('Error deleting transaction:', error)
      return
    }
    setTransactions(prev => adjustLinkedCount(prev.filter(t => t.id !== id), target?.related_transaction_id, null))
  }

  const handleSplit = (debit: Transaction) => {
    setEditorState({
      mode: 'create',
      prefill: {
        type: 'split_credit',
        account_id: debit.account_id,
        description: `Split: ${debit.description}`,
        related_transaction_id: debit.id,
      },
    })
  }

  const handleRepay = (loan: Transaction) => {
    const repaymentType: TransactionType = loan.type === 'lend_out' ? 'repayment_received' : 'repayment_made'
    const loans = loan.type === 'lend_out' ? lendOutLoans : lendInLoans
    const outstanding = loans.find(l => l.transaction.id === loan.id)?.outstanding ?? loan.amount

    setEditorState({
      mode: 'create',
      prefill: {
        type: repaymentType,
        account_id: loan.account_id,
        amount: Math.max(0, outstanding),
        description: `Repayment: ${loan.description}`,
        related_transaction_id: loan.id,
      },
    })
  }

  const handleTopup = (loan: Transaction) => {
    const topupType: TransactionType = loan.type === 'lend_out' ? 'lend_out_topup' : 'lend_in_topup'

    setEditorState({
      mode: 'create',
      prefill: {
        type: topupType,
        account_id: loan.account_id,
        description: `Top-up: ${loan.description}`,
        related_transaction_id: loan.id,
      },
    })
  }

  return (
    <div className="w-[85vw] mt-10">
      <div className="flex justify-between items-center mb-4 border-b border-[#303030] pb-2">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2" id="transactions">
          <Wallet className="w-5 h-5 text-gray-400" /> Transactions
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddAccount(true)}
            className="px-3 py-2 rounded-lg bg-[#121212] text-gray-300 hover:bg-[#303030] transition border border-[#303030] text-sm"
          >
            + Account
          </button>
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3 py-2 rounded-lg bg-[#121212] text-gray-300 hover:bg-[#303030] transition border border-[#303030] text-sm"
          >
            + Category
          </button>
          <button
            onClick={() => setEditorState({ mode: 'create' })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium"
          >
            <PlusCircle size={18} /> Add Transaction
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#303030] w-fit">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => changeSection(id)}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition ${
              section === id ? 'bg-[#303030] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-400 mt-4">Loading transactions...</p>}

      {section === 'dashboard' && (
        <TransactionDashboard
          transactions={transactions}
          accounts={accounts}
          categories={categories}
        />
      )}
      {section === 'budget' && <BudgetPanel transactions={transactions} categories={categories} accounts={accounts} />}
      {section === 'history' && (
        <TransactionList
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          lendOutLoans={lendOutLoans}
          lendInLoans={lendInLoans}
          onAdd={() => setEditorState({ mode: 'create' })}
          onEdit={(t) => setEditorState({ mode: 'edit', transaction: t })}
          onDelete={handleDeleteTransaction}
          onRepay={handleRepay}
          onTopup={handleTopup}
          onSplit={handleSplit}
          onShowLinked={setLinkedParentId}
        />
      )}
      {section === 'groups' && (
        <TransactionGroups transactions={transactions} accounts={accounts} categories={categories} />
      )}

      {linkedParentId && (
        <LinkedTransactionsModel
          parentId={linkedParentId}
          accounts={accounts}
          onClose={() => setLinkedParentId(null)}
        />
      )}

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
      {showAddAccount && (
        <AccountModal onClose={() => setShowAddAccount(false)} onCreate={handleCreateAccount} />
      )}
      {showAddCategory && (
        <TransactionCategoryModal onClose={() => setShowAddCategory(false)} onCreate={handleCreateCategory} />
      )}
    </div>
  )
}

export default Transactions
