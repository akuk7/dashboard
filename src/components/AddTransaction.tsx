import React, { useEffect, useState } from 'react'
import { X, PlusCircle, Save } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../types/transaction'

type Props = {
  transaction: Transaction | null // null for new, populated for editing
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  onClose: () => void
  onSave: (transaction: Transaction) => void
}

const AddTransaction: React.FC<Props> = ({ transaction, accounts, categories, onClose, onSave }) => {
  const isEditing = transaction !== null

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('debit')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description)
      setAmount(String(transaction.amount))
      setType(transaction.type)
      setAccountId(transaction.account_id)
      setToAccountId(transaction.to_account_id ?? '')
      setCategoryId(transaction.category_id ?? '')
      setTransactionDate(transaction.transaction_date)
    } else {
      setDescription('')
      setAmount('')
      setType('debit')
      setAccountId(accounts[0]?.id ?? '')
      setToAccountId('')
      setCategoryId('')
      setTransactionDate(new Date().toISOString().split('T')[0])
    }
  }, [transaction, accounts])

  const isTransfer = type === 'internal_transfer'

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType)
    if (nextType !== 'internal_transfer') setToAccountId('')
  }

  const handleSave = async () => {
    const parsedAmount = Number(amount)
    if (!description.trim() || !accountId || !parsedAmount || parsedAmount <= 0) {
      setError('Description, amount and account are required.')
      return
    }
    if (isTransfer && (!toAccountId || toAccountId === accountId)) {
      setError('Pick a different destination account for the transfer.')
      return
    }

    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      type,
      account_id: accountId,
      to_account_id: isTransfer ? toAccountId : null,
      category_id: isTransfer ? null : (categoryId || null),
      transaction_date: transactionDate,
    }

    const { data, error: saveError } = isEditing
      ? await supabase.from('transactions').update(payload).match({ id: transaction!.id }).select('*').single()
      : await supabase.from('transactions').insert([{ id: crypto.randomUUID(), ...payload }]).select('*').single()

    if (saveError) {
      console.error('Error saving transaction:', saveError)
      setError('Could not save transaction.')
      return
    }

    onSave(data as Transaction)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <PlusCircle className="w-5 h-5 text-gray-400" /> {isEditing ? 'Edit Transaction' : 'New Transaction'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <label className="block mb-2 text-sm font-medium text-gray-300">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 mb-4 text-white outline-none"
          placeholder="e.g. Grocery shopping"
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
              className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
              <option value="internal_transfer">Internal Transfer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              {isTransfer ? 'From Account' : 'Account'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
            >
              <option value="" disabled>Select account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {isTransfer ? (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">To Account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
              >
                <option value="" disabled>Select account</option>
                {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
              >
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-medium text-gray-300">Date</label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="bg-[#0A0A0A] border border-[#303030] text-gray-100 rounded-lg px-3 py-1 text-sm focus:border-white outline-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-[#303030]">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-white text-black font-bold hover:bg-gray-200 shadow-lg shadow-white/5 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddTransaction
