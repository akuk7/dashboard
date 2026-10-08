// TransactionTypes.ts

export type TransactionType =
  | 'debit'
  | 'credit'
  | 'internal_transfer'
  | 'lend_out'
  | 'lend_in'
  | 'lend_out_topup' // adds to an existing lend_out loan (e.g. lending another 2k after an initial 10k)
  | 'lend_in_topup' // adds to an existing lend_in loan
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
  // True for lend_out/lend_in/*_topup transactions that are small/personal - included in account
  // balance and the combined Lent In/Out/Total row. False or null for big loans/arrears - excluded
  // from balance, counted only in the Lent (non-temporary) box and Net Worth. Always true for
  // non-lend types.
  is_temporary: boolean | null
  // Points at the lend_out/lend_in transaction this one is linked to: set for repayment_received/
  // repayment_made (subtracts from that loan's outstanding) and lend_out_topup/lend_in_topup (adds
  // to it) - null for everything else.
  related_loan_id: string | null
}
