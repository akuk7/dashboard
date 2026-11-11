import React, { useState } from 'react'
import { X, Luggage } from 'lucide-react'
import type { TransactionGroup } from '../types/transaction'

type Props = {
  group: TransactionGroup | null // null = create
  onClose: () => void
  onSave: (values: { name: string; start_date: string | null; end_date: string | null }) => void
}

const inputCls = 'w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 text-white outline-none'

const TransactionGroupModel: React.FC<Props> = ({ group, onClose, onSave }) => {
  const [name, setName] = useState(group?.name ?? '')
  const [startDate, setStartDate] = useState(group?.start_date ?? '')
  const [endDate, setEndDate] = useState(group?.end_date ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    if (!name.trim()) return setError('Give the group a name.')
    if (startDate && endDate && endDate < startDate) return setError('End date is before the start date.')
    onSave({ name: name.trim(), start_date: startDate || null, end_date: endDate || null })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-sm p-6 border border-[#303030] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <Luggage className="w-5 h-5 text-gray-400" /> {group ? 'Edit Group' : 'New Group'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <label className="block mb-2 text-sm font-medium text-gray-300">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className={`${inputCls} mb-4`}
          placeholder="e.g. Goa trip"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Start (optional)</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">End (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200">
            {group ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionGroupModel
