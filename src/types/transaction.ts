// TransactionTypes.ts

export type TransactionType = 'debit' | 'credit' | 'internal_transfer'

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
}
