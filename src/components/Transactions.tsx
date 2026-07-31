import { useState, useEffect, useMemo } from 'react'
import { PlusCircle, Wallet } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../types/transaction'
import { getLoansWithOutstanding } from '../lib/loans'
import AddTransaction from './AddTransaction'
import AccountModal from '../models/AccountModel'
import TransactionCategoryModal from '../models/TransactionCategoryModel'
import TransactionDashboard from './TransactionDashboard'
import TransactionList from './TransactionList'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create'; prefill?: Partial<Transaction> }
  | { mode: 'edit'; transaction: Transaction }

const Transactions: React.FC = () => {
  const [accounts, setAccounts] = useState<TransactionAccount[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editorState, setEditorState] = useState<EditorState>({ mode: 'closed' })
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)

  const lendOutLoans = useMemo(() => getLoansWithOutstanding(transactions, 'lend_out'), [transactions])
  const lendInLoans = useMemo(() => getLoansWithOutstanding(transactions, 'lend_in'), [transactions])

  const loadData = async () => {
    setIsLoading(true)
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

  const handleTransactionSaved = (transaction: Transaction) => {
    setTransactions(prev => {
      const exists = prev.some(t => t.id === transaction.id)
      if (exists) return prev.map(t => (t.id === transaction.id ? transaction : t))
      return [transaction, ...prev]
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
    const { error } = await supabase.from('transactions').delete().match({ id })
    if (error) {
      console.error('Error deleting transaction:', error)
      return
    }
    setTransactions(prev => prev.filter(t => t.id !== id))
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
        repays_transaction_id: loan.id,
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

      {isLoading && <p className="text-gray-400">Loading transactions...</p>}

      <TransactionDashboard
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        lendOutLoans={lendOutLoans}
        lendInLoans={lendInLoans}
      />
      <TransactionList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        lendOutLoans={lendOutLoans}
        lendInLoans={lendInLoans}
        onEdit={(t) => setEditorState({ mode: 'edit', transaction: t })}
        onDelete={handleDeleteTransaction}
        onRepay={handleRepay}
      />

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
