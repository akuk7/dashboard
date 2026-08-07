import { useCallback, useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { PlusCircle, List, BarChart3, AlertTriangle } from 'lucide-react'
import supabase from '../../lib/supabase'
import type { TodoTask, TodoStatus } from '../../types/TodoTypes'
import TodoEditorModal from '../../models/TodoEditorModel'
import MobileHeader from '../MobileHeader'
import MobileTaskAnalytics from './MobileTaskAnalytics'

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

const getLastWeekDate = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

const isOverdue = (dateString: string | null, status: TodoStatus): boolean => {
  if (!dateString || status === 'DONE') return false
  const expected = new Date(dateString)
  const today = new Date()
  expected.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return expected.getTime() < today.getTime()
}

const MobileKanban: React.FC = () => {
  const [tasks, setTasks] = useState<Record<string, TodoTask>>({})
  const [columns, setColumns] = useState<Record<TodoStatus, { id: TodoStatus; taskIds: string[] }>>({
    TODO: { id: 'TODO', taskIds: [] },
    IN_PROGRESS: { id: 'IN_PROGRESS', taskIds: [] },
    DONE: { id: 'DONE', taskIds: [] },
  })
  const [view, setView] = useState<'list' | 'graph'>('list')
  const [editorTask, setEditorTask] = useState<TodoTask | 'NEW' | null>(null)

  const loadTasks = useCallback(async () => {
    const lastWeek = getLastWeekDate()
    const { data } = await supabase
      .from('todos')
      .select('*')
      .or(`status.neq.DONE, and(status.eq.DONE, completed_at.gte.${lastWeek})`)
      .order('expected_complete_at', { ascending: true })
      .order('order_index', { ascending: true })

    const fetched = (data as TodoTask[]) || []
    const newTasks: Record<string, TodoTask> = {}
    const newColumns: Record<TodoStatus, string[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }
    fetched.forEach((t) => {
      newTasks[t.id] = t
      newColumns[t.status].push(t.id)
    })
    setTasks(newTasks)
    setColumns({
      TODO: { id: 'TODO', taskIds: newColumns.TODO },
      IN_PROGRESS: { id: 'IN_PROGRESS', taskIds: newColumns.IN_PROGRESS },
      DONE: { id: 'DONE', taskIds: newColumns.DONE },
    })
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const startCol = columns[source.droppableId as TodoStatus]
    const endCol = columns[destination.droppableId as TodoStatus]
    const task = tasks[draggableId]
    const newStatus = destination.droppableId as TodoStatus

    if (startCol.id === endCol.id) {
      const newTaskIds = Array.from(startCol.taskIds)
      newTaskIds.splice(source.index, 1)
      newTaskIds.splice(destination.index, 0, draggableId)
      setColumns((prev) => ({ ...prev, [startCol.id]: { ...startCol, taskIds: newTaskIds } }))
      return
    }

    const now = new Date().toISOString()
    const updatedTask: TodoTask = {
      ...task,
      status: newStatus,
      work_started_at: newStatus === 'IN_PROGRESS' && !task.work_started_at ? now : task.work_started_at,
      completed_at: newStatus === 'DONE' ? now : null,
    }

    const startTaskIds = Array.from(startCol.taskIds)
    startTaskIds.splice(source.index, 1)
    const endTaskIds = Array.from(endCol.taskIds)
    endTaskIds.splice(destination.index, 0, draggableId)

    setTasks((prev) => ({ ...prev, [draggableId]: updatedTask }))
    setColumns((prev) => ({
      ...prev,
      [startCol.id]: { ...startCol, taskIds: startTaskIds },
      [endCol.id]: { ...endCol, taskIds: endTaskIds },
    }))

    const { error } = await supabase.from('todos').update(updatedTask).match({ id: draggableId })
    if (error) console.error('DB update error:', error)
  }

  return (
    <div className="min-h-full pb-24">
      <MobileHeader
        title="Tasks"
        action={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#303030]">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md ${view === 'list' ? 'bg-[#303030] text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('graph')}
              className={`p-1.5 rounded-md ${view === 'graph' ? 'bg-[#303030] text-white' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {view === 'graph' ? (
        <MobileTaskAnalytics />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-col gap-4 px-4 pt-4">
            {STATUS_ORDER.map((statusId) => {
              const column = columns[statusId]
              const tasksInColumn = column.taskIds.map((id) => tasks[id])
              return (
                <div key={statusId} className="bg-[#121212] rounded-xl border border-[#303030] p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[statusId] }} />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                      {STATUS_LABELS[statusId]}
                    </h4>
                    <span className="text-xs text-gray-500">{tasksInColumn.length}</span>
                  </div>
                  <Droppable droppableId={statusId}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2 min-h-[10px]">
                        {tasksInColumn.map((task, index) => (
                          <Draggable draggableId={task.id} index={index} key={task.id}>
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => setEditorTask(task)}
                                className={`p-3 rounded-lg border ${
                                  snapshot.isDragging ? 'bg-[#1D2330] border-white/50' : 'bg-[#0A0A0A] border-[#303030]'
                                }`}
                              >
                                <p className="text-sm font-semibold text-white">{task.title}</p>
                                {task.expected_complete_at && (
                                  <p
                                    className={`text-xs mt-1 flex items-center gap-1 ${
                                      isOverdue(task.expected_complete_at, task.status)
                                        ? 'text-red-500'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {isOverdue(task.expected_complete_at, task.status) && (
                                      <AlertTriangle className="w-3 h-3" />
                                    )}
                                    Due {new Date(task.expected_complete_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {tasksInColumn.length === 0 && <p className="text-xs text-gray-600 py-2">No tasks</p>}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}

      <button
        onClick={() => setEditorTask('NEW')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {editorTask && (
        <TodoEditorModal
          task={editorTask === 'NEW' ? null : editorTask}
          onClose={() => setEditorTask(null)}
          onSave={() => {
            setEditorTask(null)
            loadTasks()
          }}
        />
      )}
    </div>
  )
}

export default MobileKanban
