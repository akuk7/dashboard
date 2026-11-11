import supabase from '../supabase'
import { todayIST } from '../dateUtils'
import { getLoansWithOutstanding } from '../loans'
import type { Transaction } from '../../types/transaction'
import type { ChatContext } from '../../types/chat'

// Live lists sent along with each message so the model can map names to ids.
export async function loadChatContext(): Promise<ChatContext> {
  const [accounts, txCats, todoCats, habits, txs] = await Promise.all([
    supabase.from('transaction_accounts').select('id,name'),
    supabase.from('transaction_categories').select('id,name'),
    supabase.from('todo_categories').select('id,name'),
    supabase.from('habits').select('id,name').eq('active', true),
    supabase.from('transactions').select('*').in('type', [
      'lend_out', 'lend_in', 'lend_out_topup', 'lend_in_topup', 'repayment_received', 'repayment_made',
    ]),
  ])

  const firstError = [accounts, txCats, todoCats, habits, txs].find(r => r.error)?.error
  if (firstError) throw new Error(firstError.message)

  const loanTxs = (txs.data ?? []) as Transaction[]
  const toLoans = (kind: 'lend_out' | 'lend_in') =>
    getLoansWithOutstanding(loanTxs, kind)
      .filter(l => l.outstanding > 0.001)
      .map(l => ({ id: l.transaction.id, name: l.transaction.description, kind, outstanding: l.outstanding }))

  return {
    today: todayIST(),
    accounts: accounts.data ?? [],
    transactionCategories: txCats.data ?? [],
    todoCategories: todoCats.data ?? [],
    habits: habits.data ?? [],
    loans: [...toLoans('lend_out'), ...toLoans('lend_in')],
  }
}
