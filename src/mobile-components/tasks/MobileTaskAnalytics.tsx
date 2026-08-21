import { useCallback, useEffect, useState } from 'react'
import supabase from '../../lib/supabase'
import type { TodoStatus } from '../../types/TodoTypes'
import { addDaysIST, startOfWeekIST, todayIST } from '../../lib/dateUtils'

const STATUS_COLORS: Record<TodoStatus, string> = {
  TODO: '#3B82F6',
  IN_PROGRESS: '#ac6bd2',
  DONE: '#10B981',
}
const STATUS_LABELS: Record<TodoStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}
const STATUS_ORDER: TodoStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

const MobileTaskAnalytics: React.FC = () => {
  const [taskCounts, setTaskCounts] = useState<Record<TodoStatus, number>>({ TODO: 0, IN_PROGRESS: 0, DONE: 0 })
  const [overdueTasks, setOverdueTasks] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    // Monday-anchored week, evaluated in IST.
    const weekStart = startOfWeekIST()
    const weekEnd = addDaysIST(weekStart, 7) // exclusive upper bound
    const startOfToday = todayIST()

    const { data, error } = await supabase
      .from('todos')
      .select('status')
      .gte('expected_complete_at', weekStart)
      .lt('expected_complete_at', weekEnd)
    if (error) console.error('Chart data error:', error)

    const counts: Record<TodoStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 }
    ;((data as { status: TodoStatus }[]) || []).forEach((row) => {
      if (row.status in counts) counts[row.status] += 1
    })
    setTaskCounts(counts)

    const { count, error: backlogError } = await supabase
      .from('todos')
      .select('id', { count: 'exact' })
      .in('status', ['TODO', 'IN_PROGRESS'])
      .lt('expected_complete_at', startOfToday)
    if (backlogError) console.error('Backlog count error:', backlogError)
    setOverdueTasks(count || 0)

    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalTasks = taskCounts.TODO + taskCounts.IN_PROGRESS + taskCounts.DONE
  const pendingTasks = taskCounts.TODO + taskCounts.IN_PROGRESS
  const pct = (n: number) => (totalTasks ? Math.round((n / totalTasks) * 100) : 0)

  if (isLoading) {
    return <p className="text-gray-500 text-sm px-4 pt-4">Calculating weekly tasks...</p>
  }

  return (
    <div className="px-4 pt-4">
      <div className="bg-[#121212] border border-[#303030] rounded-xl p-4">
        <h3 className="text-center text-lg font-bold text-white mb-4">Weekly Workload</h3>

        <div className="flex flex-col gap-4">
          {STATUS_ORDER.map((status) => (
            <div key={status}>
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>{STATUS_LABELS[status]}</span>
                <span>
                  {taskCounts[status]} ({pct(taskCounts[status])}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct(taskCounts[status])}%`, backgroundColor: STATUS_COLORS[status] }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#303030] mt-5 pt-4 flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Tasks</span>
            <span className="text-white font-semibold">{totalTasks}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pending</span>
            <span className="text-white font-semibold">{pendingTasks}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-red-500">Overdue</span>
            <span className="text-red-500 font-semibold">{overdueTasks}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileTaskAnalytics
