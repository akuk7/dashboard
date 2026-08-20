import React, { useEffect, useState } from 'react'
import { X, PlusCircle, Save } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionType } from '../types/transaction'
import type { LoanInfo } from '../lib/loans'
import { todayIST } from '../lib/dateUtils'

type Props = {
  transaction: Transaction | null // null for new, populated for editing
  prefill?: Partial<Transaction> // only applied when transaction is null (e.g. "Repay" quick action)
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  lendOutLoans: LoanInfo[]
  lendInLoans: LoanInfo[]
  onClose: () => void
  onSave: (transaction: Transaction) => void
}

const AddTransaction: React.FC<Props> = ({ transaction, prefill, accounts, categories, lendOutLoans, lendInLoans, onClose, onSave }) => {
  const isEditing = transaction !== null

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('debit')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transactionDate, setTransactionDate] = useState(todayIST())
  const [isBigLoan, setIsBigLoan] = useState(false)
  const [repaysTransactionId, setRepaysTransactionId] = useState('')
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
      setIsBigLoan(!transaction.is_temporary)
      setRepaysTransactionId(transaction.repays_transaction_id ?? '')
    } else {
      setDescription(prefill?.description ?? '')
      setAmount(prefill?.amount !== undefined ? String(prefill.amount) : '')
      setType(prefill?.type ?? 'debit')
      setAccountId(prefill?.account_id ?? accounts[0]?.id ?? '')
      setToAccountId('')
      setCategoryId('')
      setTransactionDate(todayIST())
      setIsBigLoan(false)
      setRepaysTransactionId(prefill?.repays_transaction_id ?? '')
    }
  }, [transaction, prefill, accounts])

  const isTransfer = type === 'internal_transfer'
  const isLend = type === 'lend_out' || type === 'lend_in'
  const isRepayment = type === 'repayment_received' || type === 'repayment_made'
  const repaymentLoans = type === 'repayment_received' ? lendOutLoans : lendInLoans

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType)
    if (nextType !== 'internal_transfer') setToAccountId('')
    if (nextType !== 'lend_out' && nextType !== 'lend_in') setIsBigLoan(false)
    if (nextType !== 'repayment_received' && nextType !== 'repayment_made') setRepaysTransactionId('')
  }

  const handleLoanPicked = (loanId: string) => {
    setRepaysTransactionId(loanId)
    const loan = repaymentLoans.find(l => l.transaction.id === loanId)
    if (loan) {
      setAccountId(loan.transaction.account_id)
      setAmount(String(Math.max(0, loan.outstanding)))
    }
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
    if (isRepayment && !repaysTransactionId) {
      setError('Pick which loan this repayment is for.')
      return
    }

    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      type,
      account_id: accountId,
      to_account_id: isTransfer ? toAccountId : null,
      category_id: (isTransfer || isRepayment) ? null : (categoryId || null),
      transaction_date: transactionDate,
      is_temporary: isLend ? !isBigLoan : true,
      repays_transaction_id: isRepayment ? repaysTransactionId : null,
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
              <option value="lend_out">Lend Out</option>
              <option value="lend_in">Lend In</option>
              <option value="repayment_received">Repayment Received</option>
              <option value="repayment_made">Repayment Made</option>
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
          ) : isRepayment ? (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">Which Loan?</label>
              <select
                value={repaysTransactionId}
                onChange={(e) => handleLoanPicked(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-3 text-white outline-none"
              >
                <option value="" disabled>Select loan</option>
                {repaymentLoans
                  .filter(l => l.outstanding > 0.001 || l.transaction.id === repaysTransactionId)
                  .map(l => (
                    <option key={l.transaction.id} value={l.transaction.id}>
                      {l.transaction.description} - {l.outstanding.toFixed(2)} owed
                    </option>
                  ))}
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

        {isLend && (
          <label className="flex items-start gap-2 mb-4 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isBigLoan}
              onChange={(e) => setIsBigLoan(e.target.checked)}
              className="mt-0.5"
            />
            This is a big loan / arrears, not a small personal {type === 'lend_out' ? 'lend' : 'borrow'}
            (won&apos;t affect account balance - only counted in Lent and Net Worth)
          </label>
        )}

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
