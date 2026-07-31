import type { Transaction } from '../types/transaction'

export type LoanInfo = {
  transaction: Transaction
  repaid: number
  outstanding: number
}

const REPAYMENT_TYPE_FOR = {
  lend_out: 'repayment_received',
  lend_in: 'repayment_made',
} as const

// For a given loan type, finds every lend_out/lend_in transaction and how much of it
// has been repaid so far via linked repayment_received/repayment_made rows.
export function getLoansWithOutstanding(transactions: Transaction[], loanType: 'lend_out' | 'lend_in'): LoanInfo[] {
  const repaymentType = REPAYMENT_TYPE_FOR[loanType]
  const repaidByLoanId: Record<string, number> = {}

  transactions.forEach(t => {
    if (t.type === repaymentType && t.repays_transaction_id) {
      repaidByLoanId[t.repays_transaction_id] = (repaidByLoanId[t.repays_transaction_id] ?? 0) + t.amount
    }
  })

  return transactions
    .filter(t => t.type === loanType)
    .map(t => {
      const repaid = repaidByLoanId[t.id] ?? 0
      return { transaction: t, repaid, outstanding: t.amount - repaid }
    })
}
