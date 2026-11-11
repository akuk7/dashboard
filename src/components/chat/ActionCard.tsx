import React from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import type { ChatAction } from '../../types/chat'
import type { TransactionType } from '../../types/transaction'
import { formatDisplayIST } from '../../lib/dateUtils'

type Props = {
  item: ChatAction
  onApprove: () => void
  onDismiss: () => void
}

// Same badge colours and +/- signs as the transaction list tiles.
const BADGE: Record<TransactionType, { label: string; color: string }> = {
  credit: { label: 'Credit', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  debit: { label: 'Debit', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
  split_credit: { label: 'Split', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  lend_out: { label: 'Lent Out', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  lend_in: { label: 'Lent In', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
  lend_out_topup: { label: 'Lend Out (Top-up)', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  lend_in_topup: { label: 'Lend In (Top-up)', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
  repayment_received: { label: 'Repaid', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  repayment_made: { label: 'Repaid', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
  internal_transfer: { label: 'Transfer', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
}
const SIGN: Partial<Record<TransactionType, '-' | '+'>> = {
  debit: '-', lend_out: '-', lend_out_topup: '-', repayment_made: '-',
  credit: '+', split_credit: '+', lend_in: '+', lend_in_topup: '+', repayment_received: '+',
}
const NEUTRAL_BADGE = 'text-gray-300 border-gray-500/30 bg-gray-500/10'

const ActionCard: React.FC<Props> = ({ item, onApprove, onDismiss }) => {
  const { action, labels, status, error } = item

  if (action.kind === 'clarify') {
    return <div className="text-sm text-amber-300 bg-[#0A0A0A] border border-[#303030] rounded-lg px-3 py-2">{action.question}</div>
  }

  let title: string
  let meta: string
  let badge: { label: string; color: string }
  let amount: string | null = null

  if (action.kind === 'transaction') {
    const account = action.type === 'internal_transfer' ? `${labels.account ?? ''} → ${labels.toAccount ?? ''}` : labels.account
    title = action.description
    meta = [formatDisplayIST(action.transaction_date), account, labels.category ?? labels.loan].filter(Boolean).join(' · ')
    badge = BADGE[action.type]
    amount = `${SIGN[action.type] ?? ''}${action.amount.toFixed(2)}`
  } else if (action.kind === 'todo') {
    title = action.title
    meta = ['Due ' + formatDisplayIST(action.expected_complete_at), labels.category].filter(Boolean).join(' · ')
    badge = { label: 'Todo', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' }
  } else {
    title = labels.habit ?? 'Habit'
    meta = formatDisplayIST(action.date)
    badge = { label: action.done ? 'Habit' : 'Un-log', color: action.done ? 'text-green-400 border-green-400/30 bg-green-400/10' : NEUTRAL_BADGE }
  }

  const saving = status === 'saving'
  const approved = status === 'approved'
  const dismissed = status === 'dismissed'

  return (
    <div className={`bg-[#0A0A0A] border rounded-lg px-3 py-2 ${approved ? 'border-green-700' : 'border-[#303030]'} ${dismissed ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-white truncate ${dismissed ? 'line-through' : ''}`}>{title}</div>
          <div className="text-xs text-gray-500 truncate">{meta}</div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {amount && <span className="font-bold text-white text-sm">{amount}</span>}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
        </div>

        {approved ? (
          <Check className="w-5 h-5 text-green-500 shrink-0" aria-label="Saved" />
        ) : dismissed ? null : (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onApprove}
              disabled={saving}
              aria-label="Approve"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-green-400 hover:bg-green-400/10 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
            </button>
            <button
              onClick={onDismiss}
              disabled={saving}
              aria-label="Reject"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-400/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs pt-1">{error}</p>}
    </div>
  )
}

export default ActionCard
