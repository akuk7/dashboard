import type { TransactionType } from './transaction'

// Actions returned by the chat-parse edge function (already validated server-side).
export type ParsedAction =
  | {
      kind: 'transaction'
      type: TransactionType
      amount: number
      description: string
      account_id: string
      to_account_id: string | null
      category_id: string | null
      related_loan_id: string | null
      transaction_date: string
    }
  | { kind: 'todo'; title: string; todo_category_id: string | null; expected_complete_at: string }
  | { kind: 'habit_log'; habit_id: string; date: string; done: boolean }
  | { kind: 'clarify'; question: string }

export type ActionStatus = 'pending' | 'saving' | 'approved' | 'dismissed' | 'error'

// A parsed action plus UI state. `labels` maps ids to display names, resolved when the reply
// arrives so the card shows names while the ids stay underneath.
export type ChatAction = {
  id: string
  action: ParsedAction
  labels: Record<string, string>
  status: ActionStatus
  error?: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: ChatAction[]
}

export type ChatContext = {
  today: string
  accounts: { id: string; name: string }[]
  transactionCategories: { id: string; name: string }[]
  todoCategories: { id: string; name: string }[]
  habits: { id: string; name: string }[]
  loans: { id: string; name: string; kind: 'lend_out' | 'lend_in'; outstanding: number }[]
}
