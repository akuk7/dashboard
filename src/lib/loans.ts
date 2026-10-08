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

const TOPUP_TYPE_FOR = {
  lend_out: 'lend_out_topup',
  lend_in: 'lend_in_topup',
} as const

// For a given loan type, finds every lend_out/lend_in transaction and nets in everything linked to
// it via related_loan_id: repayments subtract, top-ups (more money lent/borrowed against the same
// loan - e.g. lending another 2k after an initial 10k) add. One person/loan stays one combined
// entry no matter how many top-ups or repayments it's seen.
export function getLoansWithOutstanding(transactions: Transaction[], loanType: 'lend_out' | 'lend_in'): LoanInfo[] {
  const repaymentType = REPAYMENT_TYPE_FOR[loanType]
  const topupType = TOPUP_TYPE_FOR[loanType]
  const repaidByLoanId: Record<string, number> = {}
  const toppedUpByLoanId: Record<string, number> = {}

  transactions.forEach(t => {
    if (t.type === repaymentType && t.related_loan_id) {
      repaidByLoanId[t.related_loan_id] = (repaidByLoanId[t.related_loan_id] ?? 0) + t.amount
    } else if (t.type === topupType && t.related_loan_id) {
      toppedUpByLoanId[t.related_loan_id] = (toppedUpByLoanId[t.related_loan_id] ?? 0) + t.amount
    }
  })

  return transactions
    .filter(t => t.type === loanType)
    .map(t => {
      const repaid = repaidByLoanId[t.id] ?? 0
      const toppedUp = toppedUpByLoanId[t.id] ?? 0
      return { transaction: t, repaid, outstanding: t.amount + toppedUp - repaid }
    })
}
