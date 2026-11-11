import supabase from '../supabase'
import type { ParsedAction } from '../../types/chat'

export const RECORD_CREATED_EVENT = 'chat:record-created'

// Writes an approved action using the same payload shapes as the manual forms
// (AddTransaction, TodoEditorModel, HabitTracker). Throws on failure.
export async function commitAction(action: ParsedAction): Promise<void> {
  if (action.kind === 'transaction') {
    const isTransfer = action.type === 'internal_transfer'
    const isLend = action.type === 'lend_out' || action.type === 'lend_in'
    const isLinked = !!action.related_loan_id

    // Top-ups inherit the small/big loan status of the loan they belong to.
    let isTemporary = true
    if (isLend) {
      isTemporary = true // chat creates small personal loans; big loans/arrears stay a manual choice
    } else if (isLinked && (action.type === 'lend_out_topup' || action.type === 'lend_in_topup')) {
      const { data } = await supabase.from('transactions').select('is_temporary').eq('id', action.related_loan_id).single()
      isTemporary = data?.is_temporary ?? true
    }

    const { error } = await supabase.from('transactions').insert([{
      id: crypto.randomUUID(),
      description: action.description,
      amount: action.amount,
      type: action.type,
      account_id: action.account_id,
      to_account_id: isTransfer ? action.to_account_id : null,
      category_id: isTransfer || isLinked ? null : action.category_id,
      transaction_date: action.transaction_date,
      is_temporary: isTemporary,
      related_transaction_id: isLinked ? action.related_loan_id : null,
    }])
    if (error) throw new Error(error.message)
  } else if (action.kind === 'todo') {
    const { error } = await supabase.from('todos').insert([{
      title: action.title,
      description: null,
      expected_complete_at: action.expected_complete_at,
      status: 'TODO',
      category_id: action.todo_category_id,
      order_index: 0,
    }])
    if (error) throw new Error(error.message)
  } else if (action.kind === 'habit_log') {
    const { error } = action.done
      ? await supabase.from('habit_records').upsert([{ habit_id: action.habit_id, date: action.date, done: true }])
      : await supabase.from('habit_records').delete().match({ habit_id: action.habit_id, date: action.date })
    if (error) throw new Error(error.message)
  } else {
    return
  }

  window.dispatchEvent(new CustomEvent(RECORD_CREATED_EVENT, { detail: { kind: action.kind } }))
}
