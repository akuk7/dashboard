import type { TransactionType } from '../types/transaction'

export const typeBadge = (type: TransactionType) => {
  if (type === 'credit') return { label: 'Credit', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  if (type === 'split_credit') return { label: 'Split Credit', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' }
  if (type === 'debit') return { label: 'Debit', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
  if (type === 'lend_out') return { label: 'Lent Out', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' }
  if (type === 'lend_in') return { label: 'Lent In', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' }
  if (type === 'lend_out_topup') return { label: 'Lend Out (Top-up)', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' }
  if (type === 'lend_in_topup') return { label: 'Lend In (Top-up)', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' }
  if (type === 'repayment_received') return { label: 'Repayment Received', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  if (type === 'repayment_made') return { label: 'Repayment Made', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
  return { label: 'Transfer', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' }
}

export const AMOUNT_SIGN: Partial<Record<TransactionType, '-' | '+'>> = {
  debit: '-',
  lend_out: '-',
  lend_out_topup: '-',
  repayment_made: '-',
  credit: '+',
  split_credit: '+',
  lend_in: '+',
  lend_in_topup: '+',
  repayment_received: '+',
}
