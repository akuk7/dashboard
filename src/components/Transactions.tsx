import { useState, useEffect } from 'react'
import { PlusCircle, Wallet } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory } from '../types/transaction'
import AddTransaction from './AddTransaction'
import AccountModal from '../models/AccountModel'
import TransactionCategoryModal from '../models/TransactionCategoryModel'
import TransactionDashboard from './TransactionDashboard'
import TransactionList from './TransactionList'

const Transactions: React.FC = () => {
  const [accounts, setAccounts] = useState<TransactionAccount[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [transactionEditor, setTransactionEditor] = useState<Transaction | 'NEW' | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)

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
    setTransactionEditor(null)
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
            onClick={() => setTransactionEditor('NEW')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium"
          >
            <PlusCircle size={18} /> Add Transaction
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-400">Loading transactions...</p>}

      <TransactionDashboard transactions={transactions} accounts={accounts} categories={categories} />
      <TransactionList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        onEdit={(t) => setTransactionEditor(t)}
        onDelete={handleDeleteTransaction}
      />

      {transactionEditor && (
        <AddTransaction
          transaction={transactionEditor === 'NEW' ? null : transactionEditor}
          accounts={accounts}
          categories={categories}
          onClose={() => setTransactionEditor(null)}
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
