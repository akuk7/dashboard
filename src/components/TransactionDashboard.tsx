import React, { useMemo } from 'react'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import type { Transaction, TransactionAccount, TransactionCategory } from '../types/transaction'

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
}

const TransactionDashboard: React.FC<Props> = ({ transactions, accounts, categories }) => {
  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach(a => { map[a.id] = a.opening_balance })
    transactions.forEach(t => {
      if (t.type === 'credit') map[t.account_id] = (map[t.account_id] ?? 0) + t.amount
      else if (t.type === 'debit') map[t.account_id] = (map[t.account_id] ?? 0) - t.amount
      else if (t.type === 'internal_transfer') {
        map[t.account_id] = (map[t.account_id] ?? 0) - t.amount
        if (t.to_account_id) map[t.to_account_id] = (map[t.to_account_id] ?? 0) + t.amount
      }
    })
    return map
  }, [accounts, transactions])

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    transactions.forEach(t => {
      if (t.type === 'credit') income += t.amount
      else if (t.type === 'debit') expense += t.amount
    })
    return { income, expense, net: income - expense }
  }, [transactions])

  const categoryChart = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions
      .filter(t => t.type === 'debit')
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
  }, [transactions, categories])

  const hasSpending = categoryChart.datasets[0].data.length > 0

  return (
    <div className="flex flex-col md:flex-row gap-4 mt-6">
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-xs text-gray-500 mb-1">Income</p>
          <p className="text-lg font-bold text-green-400">{summary.income.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-xs text-gray-500 mb-1">Expense</p>
          <p className="text-lg font-bold text-red-400">{summary.expense.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
          <p className="text-xs text-gray-500 mb-1">Net</p>
          <p className={`text-lg font-bold ${summary.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {summary.net.toFixed(2)}
          </p>
        </div>

        {accounts.map(a => (
          <div key={a.id} className="p-4 bg-[#121212] rounded-xl border border-[#303030]">
            <p className="text-xs text-gray-500 mb-1 truncate">{a.name}</p>
            <p className="text-lg font-bold text-white">{(balances[a.id] ?? a.opening_balance).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="w-full md:w-[280px] p-4 bg-[#121212] rounded-xl border border-[#303030]">
        <p className="text-sm font-bold text-white mb-2">Spending by Category</p>
        {hasSpending ? (
          <>
            <div style={{ height: '180px' }}>
              <Pie data={categoryChart} options={chartOptions} />
            </div>
            <div className="flex flex-col gap-1 mt-3 text-xs text-gray-400">
              {categoryChart.labels.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                  {label}
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
