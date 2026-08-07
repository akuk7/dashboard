import { useState } from 'react'
import type { FC } from 'react'
import BottomNav from './BottomNav'
import MobileHabits from './habits/MobileHabits'
import MobileKanban from './tasks/MobileKanban'
import MobileWatchlist from './watchlist/MobileWatchlist'
import MobileTransactions from './transactions/MobileTransactions'

export type MobileTab = 'habits' | 'tasks' | 'watchlist' | 'transactions'

const SCREENS: Record<MobileTab, FC> = {
  habits: MobileHabits,
  tasks: MobileKanban,
  watchlist: MobileWatchlist,
  transactions: MobileTransactions,
}

const MobileApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('habits')
  const Screen = SCREENS[activeTab]

  return (
    <div className="flex flex-col bg-black text-white" style={{ height: '100dvh' }}>
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        <Screen />
      </div>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}

export default MobileApp
