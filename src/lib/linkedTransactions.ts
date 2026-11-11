import supabase from './supabase'
import type { Transaction } from '../types/transaction'

// What a transaction does to *spend* (Cash Flow expense, category pie, budgets): a debit adds, a
// split_credit (friends paying back their share of it) subtracts, everything else - including a
// plain credit, which is income - is neutral. Single source of truth so the desktop dashboard,
// mobile analytics and budgets can't disagree. Uses the split's own date (cash basis), so a split
// that lands in a later month lowers that month's spend, not the debit's.
export function netSpendEffect(t: Pick<Transaction, 'type' | 'amount'>): number {
  if (t.type === 'debit') return t.amount
  if (t.type === 'split_credit') return -t.amount
  return 0
}

// The DB trigger keeps linked_count right on the server; this mirrors it on the in-memory list
// after a save/delete so the parent's link badge updates without a refetch.
export function adjustLinkedCount(
  list: Transaction[],
  oldParentId: string | null | undefined,
  newParentId: string | null | undefined
): Transaction[] {
  if ((oldParentId ?? null) === (newParentId ?? null)) return list
  return list.map(t => {
    if (t.id === oldParentId) return { ...t, linked_count: Math.max(0, t.linked_count - 1) }
    if (t.id === newParentId) return { ...t, linked_count: t.linked_count + 1 }
    return t
  })
}

export type LinkedGroup = {
  parent: Transaction
  children: Transaction[]
}

// Loads one parent and everything linked to it. Both lookups hit the primary key / the
// related_transaction_id index, so this stays a handful of rows however large the history gets.
export async function fetchLinkedGroup(parentId: string): Promise<LinkedGroup | null> {
  const [{ data: parent, error: parentError }, { data: children, error: childrenError }] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', parentId).single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('related_transaction_id', parentId)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])
  if (parentError || childrenError || !parent) {
    console.error('Error loading linked transactions:', parentError ?? childrenError)
    return null
  }
  return { parent: parent as Transaction, children: (children as Transaction[]) ?? [] }
}

export type GroupSummary = { label: string; value: number; emphasis?: boolean }[]

// Totals shown in the footer of the linked-transactions modal, depending on what the parent is.
export function summarizeGroup({ parent, children }: LinkedGroup): GroupSummary {
  const sum = (types: string[]) => children.filter(c => types.includes(c.type)).reduce((s, c) => s + c.amount, 0)

  if (parent.type === 'debit') {
    const recovered = sum(['split_credit'])
    return [
      { label: 'Paid', value: parent.amount },
      { label: 'Recovered', value: recovered },
      { label: 'Your share', value: parent.amount - recovered, emphasis: true },
    ]
  }

  const isLendOut = parent.type === 'lend_out'
  const toppedUp = sum([isLendOut ? 'lend_out_topup' : 'lend_in_topup'])
  const repaid = sum([isLendOut ? 'repayment_received' : 'repayment_made'])
  return [
    { label: isLendOut ? 'Lent' : 'Borrowed', value: parent.amount + toppedUp },
    { label: 'Repaid', value: repaid },
    { label: 'Outstanding', value: parent.amount + toppedUp - repaid, emphasis: true },
  ]
}
