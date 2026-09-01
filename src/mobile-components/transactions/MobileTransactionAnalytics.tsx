import { useMemo, useState } from 'react'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { Transaction, TransactionAccount, TransactionCategory } from '../../types/transaction'
import type { LoanInfo } from '../../lib/loans'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETTE = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#38bdf8', '#facc15']

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
}

type Props = {
  transactions: Transaction[]
  accounts: TransactionAccount[]
  categories: TransactionCategory[]
  lendOutLoans: LoanInfo[]
  lendInLoans: LoanInfo[]
}

const MobileTransactionAnalytics: React.FC<Props> = ({ transactions, accounts, categories, lendOutLoans, lendInLoans }) => {
  const [summaryStartDate, setSummaryStartDate] = useState(`${new Date().getFullYear()}-08-01`)
  const [summaryEndDate, setSummaryEndDate] = useState('')

  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach((a) => {
      map[a.id] = a.opening_balance
    })
    transactions.forEach((t) => {
      if (!t.is_temporary) return
      if (t.type === 'credit' || t.type === 'lend_in' || t.type === 'repayment_received') {
        map[t.account_id] = (map[t.account_id] ?? 0) + t.amount
      } else if (t.type === 'debit' || t.type === 'lend_out' || t.type === 'repayment_made') {
        map[t.account_id] = (map[t.account_id] ?? 0) - t.amount
      } else if (t.type === 'internal_transfer') {
        map[t.account_id] = (map[t.account_id] ?? 0) - t.amount
        if (t.to_account_id) map[t.to_account_id] = (map[t.to_account_id] ?? 0) + t.amount
      }
    })
    return map
  }, [accounts, transactions])

  const netBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (balances[a.id] ?? a.opening_balance), 0),
    [accounts, balances]
  )

  const loanTotals = useMemo(
    () => ({
      lentOut: lendOutLoans.reduce((sum, l) => sum + Math.max(0, l.outstanding), 0),
      lentIn: lendInLoans.reduce((sum, l) => sum + Math.max(0, l.outstanding), 0),
      lentOutNonTemp: lendOutLoans.filter((l) => !l.transaction.is_temporary).reduce((sum, l) => sum + Math.max(0, l.outstanding), 0),
      lentInNonTemp: lendInLoans.filter((l) => !l.transaction.is_temporary).reduce((sum, l) => sum + Math.max(0, l.outstanding), 0),
    }),
    [lendOutLoans, lendInLoans]
  )

  const netWorth = netBalance + loanTotals.lentOut - loanTotals.lentIn
  // Net Balance already includes the cash effect of temporary (small/personal) loans. "Net (Settled)"
  // projects what's left once those specific loans are cleared: temp lent-out money added back, temp borrowed money subtracted.
  const netAfterTemp = (() => {
    const lentOutTemp = loanTotals.lentOut - loanTotals.lentOutNonTemp
    const lentInTemp = loanTotals.lentIn - loanTotals.lentInNonTemp
    return netBalance + lentOutTemp - lentInTemp
  })()

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    transactions.forEach((t) => {
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
      .filter((t) => t.type === 'debit' && t.transaction_date >= summaryStartDate && (!summaryEndDate || t.transaction_date <= summaryEndDate))
      .forEach((t) => {
        const key = t.category_id ?? 'uncategorized'
        totals[key] = (totals[key] ?? 0) + t.amount
      })

    const entries = Object.entries(totals)
    const labels = entries.map(([id]) =>
      id === 'uncategorized' ? 'Uncategorized' : categories.find((c) => c.id === id)?.name ?? 'Unknown'
    )
    const data = entries.map(([, amount]) => amount)

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#0A0A0A',
          borderWidth: 1,
        },
      ],
    }
  }, [transactions, categories, summaryStartDate, summaryEndDate])

  const hasSpending = categoryChart.datasets[0].data.length > 0

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-[#121212] rounded-xl border border-white/40">
          <p className="text-[11px] text-gray-500 mb-1">Net Balance</p>
          <p className={`text-base font-bold ${netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{netBalance.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-[11px] text-gray-500 mb-1">Net (Settled)</p>
          <p className={`text-base font-bold ${netAfterTemp >= 0 ? 'text-white' : 'text-red-400'}`}>{netAfterTemp.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-[#121212] rounded-xl border border-white/40">
          <p className="text-[11px] text-gray-500 mb-1">Net Worth</p>
          <p className={`text-base font-bold ${netWorth >= 0 ? 'text-white' : 'text-red-400'}`}>{netWorth.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-[11px] text-gray-500 mb-1">Lent In</p>
          <p className="text-base font-bold text-cyan-400">{loanTotals.lentIn.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-[11px] text-gray-500 mb-1">Lent Out</p>
          <p className="text-base font-bold text-amber-400">{loanTotals.lentOut.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-[11px] text-gray-500 mb-1">Lent Total</p>
          <p className={`text-base font-bold ${(loanTotals.lentOut - loanTotals.lentIn) >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
            {(loanTotals.lentOut - loanTotals.lentIn).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {accounts.map((a) => (
          <div key={a.id} className="p-3 bg-[#121212] rounded-xl border border-[#303030]">
            <p className="text-[11px] text-gray-500 mb-1 truncate">{a.name}</p>
            <p className="text-base font-bold text-white">{(balances[a.id] ?? a.opening_balance).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
          <div className="flex items-center justify-evenly mb-2">
               <span className="text-xs text-gray-500">From</span>
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
        <div className="grid grid-cols-3 gap-2 mb-4">
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
            <div style={{ height: '200px' }}>
              <Pie data={categoryChart} options={chartOptions} />
            </div>
            <div className="grid grid-cols-2 gap-1 mt-3 text-xs text-gray-400">
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

export default MobileTransactionAnalytics
