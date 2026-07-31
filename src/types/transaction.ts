// TransactionTypes.ts

export type TransactionType =
  | 'debit'
  | 'credit'
  | 'internal_transfer'
  | 'lend_out'
  | 'lend_in'
  | 'repayment_received' // settles a lend_out - money coming back to you
  | 'repayment_made' // settles a lend_in - you paying back what you borrowed

export interface TransactionAccount {
  id: string
  name: string
  opening_balance: number
  created_at: string
}

export interface TransactionCategory {
  id: string
  name: string
  created_at: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  account_id: string
  to_account_id: string | null
  category_id: string | null
  transaction_date: string
  created_at: string
  // False only for lend_out/lend_in transactions that already happened before tracking started -
  // excluded from account balance / Net Balance, but still counted in Lent / Net Worth.
  affects_balance: boolean
  // Set only for repayment_received/repayment_made - points at the lend_out/lend_in it settles.
  repays_transaction_id: string | null
}
