import React, { useCallback, useEffect, useState } from 'react'
import { Luggage, PlusCircle, Edit, Trash2 } from 'lucide-react'
import supabase from '../lib/supabase'
import type { Transaction, TransactionAccount, TransactionCategory, TransactionGroup, TransactionGroupStats } from '../types/transaction'
import TransactionGroupModel from '../models/TransactionGroupModel'
import GroupTransactionsModel from '../models/GroupTransactionsModel'
import { formatDisplayIST } from '../lib/dateUtils'

type Props = {
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  // Totals come from a DB view; re-fetch whenever the transactions list changes (add/edit/delete).
  transactions: Transaction[]
  variant?: 'desktop' | 'mobile'
}

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; group: TransactionGroup }

// Self-contained "Groups" section (trips, events): lists every group with its stats in a row;
// clicking one opens all the transactions attached to it. Used by both the desktop dashboard and
// the mobile Transactions view.
const TransactionGroups: React.FC<Props> = ({ accounts, categories, transactions, variant = 'desktop' }) => {
  const [groups, setGroups] = useState<TransactionGroup[]>([])
  const [stats, setStats] = useState<Record<string, TransactionGroupStats>>({})
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [openGroup, setOpenGroup] = useState<TransactionGroup | null>(null)

  const load = useCallback(async () => {
    const [{ data: groupData }, { data: statData }] = await Promise.all([
      supabase.from('transaction_groups').select('*').order('created_at', { ascending: false }),
      supabase.from('transaction_group_stats').select('*'),
    ])
    setGroups((groupData as TransactionGroup[]) ?? [])
    const map: Record<string, TransactionGroupStats> = {}
    ;((statData as TransactionGroupStats[]) ?? []).forEach((s) => {
      map[s.group_id] = { ...s, spent: Number(s.spent), received: Number(s.received) }
    })
    setStats(map)
  }, [])

  useEffect(() => {
    void load()
  }, [load, transactions])

  const handleSave = async (values: { name: string; start_date: string | null; end_date: string | null }) => {
    const { error } = form.mode === 'edit'
      ? await supabase.from('transaction_groups').update(values).match({ id: form.group.id })
      : await supabase.from('transaction_groups').insert([{ id: crypto.randomUUID(), ...values }])
    if (error) {
      console.error('Error saving group:', error)
      alert('Could not save the group.')
      return
    }
    setForm({ mode: 'closed' })
    void load()
  }

  const handleDelete = async (group: TransactionGroup) => {
    const count = stats[group.id]?.txn_count ?? 0
    const message = count > 0
      ? `Delete "${group.name}"? Its ${count} transaction${count === 1 ? '' : 's'} will be kept, just no longer grouped.`
      : `Delete "${group.name}"?`
    if (!window.confirm(message)) return
    const { error } = await supabase.from('transaction_groups').delete().match({ id: group.id })
    if (error) {
      console.error('Error deleting group:', error)
      return
    }
    void load()
  }

  const isMobile = variant === 'mobile'

  return (
    <div className={isMobile ? 'px-4 pt-4' : 'p-6 border border-[#303030] shadow-md rounded-xl text-gray-100 mt-6'}>
      <div className="flex justify-between items-center mb-4 border-b border-[#303030] pb-3">
        <h4 className="text-xl font-bold text-white flex items-center gap-2" id={isMobile ? undefined : 'groups'}>
          <Luggage className="w-5 h-5 text-gray-400" /> Groups ({groups.length})
        </h4>
        <button
          onClick={() => setForm({ mode: 'create' })}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-lg font-medium text-sm"
        >
          <PlusCircle size={16} /> New Group
        </button>
      </div>

      <div className={`flex flex-col gap-2 ${isMobile ? '' : 'max-h-[400px] overflow-y-auto pr-2'}`}>
        {groups.map((g) => {
          const s = stats[g.id]
          const spent = s?.spent ?? 0
          const received = s?.received ?? 0
          const count = s?.txn_count ?? 0
          const range = [g.start_date, g.end_date].filter(Boolean).map((d) => formatDisplayIST(d as string)).join(' – ')
          return (
            <div
              key={g.id}
              onClick={() => setOpenGroup(g)}
              className="flex items-center justify-between gap-3 p-3 bg-[#121212] rounded-lg border border-[#303030] cursor-pointer hover:border-gray-500 transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{g.name}</p>
                <p className="text-xs text-gray-500">
                  {count} transaction{count === 1 ? '' : 's'}{range ? ` · ${range}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Spent {spent.toFixed(2)} · Received {received.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-right">
                  <span className="block text-lg font-bold text-white leading-tight">{(spent - received).toFixed(2)}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500">net cost</span>
                </span>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setForm({ mode: 'edit', group: g })} className="text-gray-600 hover:text-white" title="Edit group">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(g)} className="text-gray-600 hover:text-red-500" title="Delete group">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {groups.length === 0 && <p className="text-gray-400 mt-2">No groups yet. Create one for a trip or event.</p>}
      </div>

      {form.mode !== 'closed' && (
        <TransactionGroupModel
          group={form.mode === 'edit' ? form.group : null}
          onClose={() => setForm({ mode: 'closed' })}
          onSave={handleSave}
        />
      )}
      {openGroup && (
        <GroupTransactionsModel group={openGroup} accounts={accounts} categories={categories} onClose={() => setOpenGroup(null)} />
      )}
    </div>
  )
}

export default TransactionGroups
