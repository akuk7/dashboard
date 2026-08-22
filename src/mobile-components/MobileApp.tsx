import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import MobileHabits from './habits/MobileHabits'
import MobileKanban from './tasks/MobileKanban'
import MobileWatchlist from './watchlist/MobileWatchlist'
import MobileTransactions from './transactions/MobileTransactions'
import MobileWorkouts from './workouts/MobileWorkouts'

export type MobileTab = 'watchlist' | 'habits' | 'tasks' | 'transactions' | 'workouts'

const MobileApp: React.FC = () => {
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
      <Routes>
        <Route path="/" element={<Navigate to="/watchlist" replace />} />
        <Route path="/watchlist" element={<MobileWatchlist />} />
        <Route path="/habits" element={<MobileHabits />} />
        <Route path="/tasks" element={<MobileKanban />} />
        <Route path="/transactions" element={<MobileTransactions />} />
        <Route path="/workouts" element={<MobileWorkouts />} />
        <Route path="*" element={<Navigate to="/watchlist" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default MobileApp
