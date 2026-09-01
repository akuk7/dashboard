import React, { useMemo, useState } from 'react'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import type { Transaction, TransactionAccount, TransactionCategory } from '../types/transaction'
import type { LoanInfo } from '../lib/loans'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      callbacks: {
        label: function (context: TooltipItem<'pie'>): string {
          let label = context.label || ''
          if (label) {
            label += ': '
          }
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const value = context.parsed as number
          const percentage = total ? ((value / total) * 100).toFixed(1) + '%' : '0%'
          return label + value.toFixed(2) + ' (' + percentage + ')'
        },
      },
    },
  },
}

const PALETTE = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#38bdf8', '#facc15']

type Props = {
  transactions: Transaction[]
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  lendOutLoans: LoanInfo[]
  lendInLoans: LoanInfo[]
}

const TransactionDashboard: React.FC<Props> = ({ transactions, accounts, categories, lendOutLoans, lendInLoans }) => {
  const [summaryStartDate, setSummaryStartDate] = useState(`${new Date().getFullYear()}-08-01`)
  const [summaryEndDate, setSummaryEndDate] = useState('')

  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach(a => { map[a.id] = a.opening_balance })
    transactions.forEach(t => {
      if (!t.is_temporary) return
      if (t.type === 'credit' || t.type === 'lend_in' || t.type === 'repayment_received') map[t.account_id] = (map[t.account_id] ?? 0) + t.amount
      else if (t.type === 'debit' || t.type === 'lend_out' || t.type === 'repayment_made') map[t.account_id] = (map[t.account_id] ?? 0) - t.amount
      else if (t.type === 'internal_transfer') {
        map[t.account_id] = (map[t.account_id] ?? 0) - t.amount
        if (t.to_account_id) map[t.to_account_id] = (map[t.to_account_id] ?? 0) + t.amount
      }
    })
    return map
  }, [accounts, transactions])

  // Raw cash across all accounts - lend_out/lend_in move real cash just like debit/credit,
  // so this figure doesn't distinguish loans from ordinary spending/income.
  const netBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (balances[a.id] ?? a.opening_balance), 0)
  }, [accounts, balances])

  // Outstanding = original loan amount minus repayments received/made against it so far.
  // "NonTemp" variants only count big loans/arrears (is_temporary false/null) - the ones excluded from balance.
  const loanTotals = useMemo(() => {
    const lentOut = lendOutLoans.reduce((sum, l) => sum + Math.max(0, l.outstanding), 0)
    const lentIn = lendInLoans.reduce((sum, l) => sum + Math.max(0, l.outstanding), 0)
    const lentOutNonTemp = lendOutLoans.filter(l => !l.transaction.is_temporary).reduce((sum, l) => sum + Math.max(0, l.outstanding), 0)
    const lentInNonTemp = lendInLoans.filter(l => !l.transaction.is_temporary).reduce((sum, l) => sum + Math.max(0, l.outstanding), 0)
    return { lentOut, lentIn, lentOutNonTemp, lentInNonTemp }
  }, [lendOutLoans, lendInLoans])

  // Net Balance adjusted for outstanding loans: money still lent out is still yours (add back),
  // money still borrowed isn't really yours (subtract). Uses all loans regardless of temporary flag.
  const netWorth = useMemo(() => {
    return netBalance + loanTotals.lentOut - loanTotals.lentIn
  }, [netBalance, loanTotals])

  // Net Balance already includes the cash effect of temporary (small/personal) loans, since those
  // move through the balance. "Net (Settled)" projects what's left once those specific loans are
  // cleared: temporary money lent out comes back (add it), temporary money borrowed must be repaid (subtract it).
  const netAfterTemp = useMemo(() => {
    const lentOutTemp = loanTotals.lentOut - loanTotals.lentOutNonTemp
    const lentInTemp = loanTotals.lentIn - loanTotals.lentInNonTemp
    return netBalance + lentOutTemp - lentInTemp
  }, [netBalance, loanTotals])

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    transactions.forEach(t => {
      if (t.transaction_date < summaryStartDate) return
      if (summaryEndDate && t.transaction_date > summaryEndDate) return
      if (t.type === 'credit') income += t.amount
      else if (t.type === 'debit') expense += t.amount
    })
    return { income, expense, net: income - expense }
  }, [transactions, summaryStartDate, summaryEndDate])

  const categoryChart = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions
      .filter(t => t.type === 'debit' && t.transaction_date >= summaryStartDate && (!summaryEndDate || t.transaction_date <= summaryEndDate))
      .forEach(t => {
        const key = t.category_id ?? 'uncategorized'
        totals[key] = (totals[key] ?? 0) + t.amount
      })

    const entries = Object.entries(totals)
    const labels = entries.map(([id]) =>
      id === 'uncategorized' ? 'Uncategorized' : (categories.find(c => c.id === id)?.name ?? 'Unknown')
    )
    const data = entries.map(([, amount]) => amount)

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: '#0A0A0A',
        borderWidth: 1,
        hoverOffset: 8,
      }],
    }
  }, [transactions, categories, summaryStartDate, summaryEndDate])

  const hasSpending = categoryChart.datasets[0].data.length > 0

  return (
    <div className="flex flex-col md:flex-row gap-4 mt-6">
      <div className="flex-1 flex flex-col gap-4">
        {/* Row 1: headline totals */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-[#121212] rounded-xl border border-white/40" title="Raw cash across all accounts, treating lend_out/lend_in as ordinary cash movements">
            <p className="text-xs text-gray-500 mb-1">Net Balance</p>
            <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{netBalance.toFixed(2)}</p>
          </div>

          <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]" title="Net Balance with temporary (small/personal) loans settled - lent-out temp money added back, borrowed temp money subtracted. Shows what you'd have left once those specific loans clear.">
            <p className="text-xs text-gray-500 mb-1">Net (Settled)</p>
            <p className={`text-lg font-bold ${netAfterTemp >= 0 ? 'text-white' : 'text-red-400'}`}>{netAfterTemp.toFixed(2)}</p>
          </div>

          <div className="p-4 bg-[#121212] rounded-xl border border-white/40" title="Net Balance plus money lent out (still owed to you) minus money borrowed (still owed by you)">
            <p className="text-xs text-gray-500 mb-1">Net Worth</p>
            <p className={`text-lg font-bold ${netWorth >= 0 ? 'text-white' : 'text-red-400'}`}>{netWorth.toFixed(2)}</p>
          </div>
        </div>

        {/* Row 1b: total lending exposure, including temporary (small/personal) loans */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
            <p className="text-xs text-gray-500 mb-1">Lent In</p>
            <p className="text-lg font-bold text-cyan-400">{loanTotals.lentIn.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
            <p className="text-xs text-gray-500 mb-1">Lent Out</p>
            <p className="text-lg font-bold text-amber-400">{loanTotals.lentOut.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]" title="Lent Out minus Lent In, across all loans including small/personal ones">
            <p className="text-xs text-gray-500 mb-1">Lent Total</p>
            <p className={`text-lg font-bold ${(loanTotals.lentOut - loanTotals.lentIn) >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {(loanTotals.lentOut - loanTotals.lentIn).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Row 2: per-account balances */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {accounts.map(a => (
            <div key={a.id} className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
              <p className="text-xs text-gray-500 mb-1 truncate">{a.name}</p>
              <p className="text-lg font-bold text-white">{(balances[a.id] ?? a.opening_balance).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-[320px] p-4 bg-[#121212] rounded-xl border border-[#303030]">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-xs text-gray-500 flex-shrink-0">From</p>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={summaryStartDate}
              onChange={(e) => setSummaryStartDate(e.target.value)}
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-xs text-gray-300"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={summaryEndDate}
              onChange={(e) => setSummaryEndDate(e.target.value)}
              placeholder="today"
              className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-xs text-gray-300"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 bg-[#0A0A0A] rounded-lg border border-[#303030]">
            <p className="text-[10px] text-gray-500 mb-0.5">Income</p>
            <p className="text-sm font-bold text-green-400 truncate">{summary.income.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-[#0A0A0A] rounded-lg border border-[#303030]">
            <p className="text-[10px] text-gray-500 mb-0.5">Expense</p>
            <p className="text-sm font-bold text-red-400 truncate">{summary.expense.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-[#0A0A0A] rounded-lg border border-[#303030]">
            <p className="text-[10px] text-gray-500 mb-0.5">Net</p>
            <p className={`text-sm font-bold truncate ${summary.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.net.toFixed(2)}
            </p>
          </div>
        </div>

        {hasSpending ? (
          <>
            <div style={{ height: '140px' }}>
              <Pie data={categoryChart} options={chartOptions} />
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-gray-400">
              {categoryChart.labels.map((label, i) => (
                <div key={label} className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">No spending yet.</p>
        )}
      </div>
    </div>
  )
}

export default TransactionDashboard
