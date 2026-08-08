import { useEffect, useState } from 'react'
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
  const [activeTab, setActiveTab] = useState<MobileTab>('watchlist')
  const Screen = SCREENS[activeTab]

  useEffect(() => {
    document.documentElement.classList.add('mobile-app-shell')
    document.body.classList.add('mobile-app-shell')
    return () => {
      document.documentElement.classList.remove('mobile-app-shell')
      document.body.classList.remove('mobile-app-shell')
    }
  }, [])

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-black text-white">
      <Screen />
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}

export default MobileApp
