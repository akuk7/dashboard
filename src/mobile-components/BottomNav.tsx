import { CheckSquare, ListTodo, Film, Wallet } from 'lucide-react'
import type { MobileTab } from './MobileApp'

const TABS: { id: MobileTab; label: string; icon: typeof CheckSquare }[] = [
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'watchlist', label: 'WatchList', icon: Film },
  { id: 'transactions', label: 'Money', icon: Wallet },
]

type Props = {
  activeTab: MobileTab
  onChange: (tab: MobileTab) => void
}

const BottomNav: React.FC<Props> = ({ activeTab, onChange }) => {
  return (
    <nav className="flex-shrink-0 flex items-stretch justify-around border-t border-[#303030] bg-[#0A0A0A]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-1 py-2 px-3 flex-1 transition ${isActive ? 'text-white' : 'text-gray-500'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[11px]">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
