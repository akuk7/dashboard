import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { PlusCircle, Edit, AlertTriangle, ListTodo } from "lucide-react";
import supabase from "../lib/supabase";
import type { TodoTask, TodoStatus } from "../types/TodoTypes";
// Assuming you have a file structure where TodoEditorModel is accessible
import TodoEditorModal from "../models/TodoEditorModel";
import WeeklyTaskDistribution from "../models/WeeklyTaskDistribution";

// Helper to get date strings for last 7 days (for DONE filtering)
const getLastWeekDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
};
const CHART_COLORS = {
    'TODO': '#3B82F6',       // Blue
    'IN_PROGRESS': '#ac6bd2', // Darker Blue
    'DONE': '#10B981',       // Green
    'DEFAULT': '#4B5563',    // Gray
};
// --- DATA & STATE MANAGEMENT ---

const TodoKanban: React.FC = () => {
  const [tasks, setTasks] = useState<Record<string, TodoTask>>({});
  const [columns, setColumns] = useState<
    Record<TodoStatus, { id: TodoStatus; title: string; taskIds: string[] }>
  >({
    TODO: { id: "TODO", title: "TO DO", taskIds: [] },
    IN_PROGRESS: { id: "IN_PROGRESS", title: "IN PROGRESS", taskIds: [] },
    DONE: { id: "DONE", title: "DONE", taskIds: [] },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editorTask, setEditorTask] = useState<TodoTask | "NEW" | null>(null);

  // --- FETCH DATA (FIXED LOGIC) ---
  const loadTasks = useCallback(async () => {
    setIsLoading(true);

    const lastWeek = getLastWeekDate();

    // FIX: The query must fetch all non-DONE tasks OR recently DONE tasks.
    const { data } = await supabase
    .from("todos")
    .select("*")
    .or(`status.neq.DONE, and(status.eq.DONE, completed_at.gte.${lastWeek})`)
    
    // 1. Sort by expected_complete_at: ASC (Ascending = earliest date first)
    // 2. Add 'order_index' as a secondary sort key in case due dates are the same.
    .order("expected_complete_at", { ascending: true }) 
    .order("order_index", { ascending: true });

    const fetchedTasks = (data as TodoTask[]) || [];

    // Structure data for DND state
    const newTasks: Record<string, TodoTask> = {};
    const newColumns: Record<TodoStatus, string[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    fetchedTasks.forEach((task) => {
      newTasks[task.id] = task;
      newColumns[task.status].push(task.id);
    });

    setTasks(newTasks);
    setColumns({
      TODO: { id: "TODO", title: "TO DO", taskIds: newColumns.TODO },
      IN_PROGRESS: {
        id: "IN_PROGRESS",
        title: "IN PROGRESS",
        taskIds: newColumns.IN_PROGRESS,
      },
      DONE: { id: "DONE", title: "DONE", taskIds: newColumns.DONE },
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // --- DND LOGIC ---

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const startCol = columns[source.droppableId as TodoStatus];
    const endCol = columns[destination.droppableId as TodoStatus];
    const task = tasks[draggableId];
    const newStatus = destination.droppableId as TodoStatus;

    const updatedTask = { ...task };
    const now = new Date().toISOString();

    // 1. Moving within the same column (Reordering) - Skipping order_index DB update for simplicity
    if (startCol.id === endCol.id) {
      const newTaskIds = Array.from(startCol.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...startCol, taskIds: newTaskIds };
      setColumns((prev) => ({ ...prev, [startCol.id]: newColumn }));
      return;
    }

    // 2. Moving to a different column (Status Change)

    // a. Update the task object based on new status
    updatedTask.status = newStatus;
    updatedTask.work_started_at =
      newStatus === "IN_PROGRESS" && !task.work_started_at
        ? now
        : task.work_started_at;
    updatedTask.completed_at = newStatus === "DONE" ? now : null;

    // b. Update state: Remove from start column
    const startTaskIds = Array.from(startCol.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStartCol = { ...startCol, taskIds: startTaskIds };

    // c. Update state: Add to end column
    const endTaskIds = Array.from(endCol.taskIds);
    endTaskIds.splice(destination.index, 0, draggableId);
    const newEndCol = { ...endCol, taskIds: endTaskIds };

    // d. Update the final state
    setTasks((prev) => ({ ...prev, [draggableId]: updatedTask }));
    setColumns((prev) => ({
      ...prev,
      [startCol.id]: newStartCol,
      [endCol.id]: newEndCol,
    }));

    // e. Update Database
    // Note: order_index update is skipped for simplicity.
    const { error } = await supabase
      .from("todos")
      .update(updatedTask)
      .match({ id: draggableId });
    if (error) console.error("DB update error:", error);
  };

  // --- UI HELPERS ---
  const isOverdue = (
    dateString: string | null,
    status: TodoStatus
  ): boolean => {
    if (!dateString) return false;
    if (status === "DONE") return false;

    const expectedDate = new Date(dateString);
    const today = new Date();
    expectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return expectedDate.getTime() < today.getTime();
  };

  // --- Updated renderDateInfo function ---
  const renderDateInfo = (task: TodoTask) => {
    const primaryDateStr =
      task.status === "DONE" ? task.completed_at : task.expected_complete_at;
    const secondaryDateStr =
      task.status === "DONE" ? task.expected_complete_at : task.created_at;
    const secondaryLabel =
      task.status === "IN_PROGRESS"
        ? "Started:"
        : task.status === "DONE"
        ? "Expected:"
        : "Created:";
    const primaryLabel = task.status === "DONE" ? "Completed" : "Due";

    // 1. Determine priority states
    const overdue = isOverdue(task.expected_complete_at, task.status);

    // Check if task is DUE SOON: Due today, tomorrow, or the day after (3 days total)
    // 3 days = 3 * 24 * 60 * 60 * 1000 milliseconds
    const dueTimeLimit = 3 * 24 * 60 * 60 * 1000;

    let isDueSoon = false;
    if (task.status !== "DONE" && task.expected_complete_at) {
      const expectedTime = new Date(task.expected_complete_at).getTime();
      const now = new Date().getTime();
      // Check if the due date is in the future AND within the 3-day window
      if (expectedTime >= now && expectedTime <= now + dueTimeLimit) {
        isDueSoon = true;
      }
    }

    // 2. Determine Final Text Color
    let textColor = "text-white";
    let icon = null;

    if (overdue) {
      // Delayed: Red
      textColor = "text-red-500 font-bold";
      icon = <AlertTriangle className="w-3 h-3" />;
    } else if (isDueSoon) {
      // Due in 3 days: Orange
      textColor = "text-yellow-500 font-bold";
    } else {
      // Completed tasks (DONE) and non-urgent active tasks: Default White/Gray
      textColor = "text-white";
    }

    // Ensure secondary text is always soft gray, unless the task is overdue/due soon.

    return (
      <div className="text-xs mt-2 space-y-1">
        {/* Primary Date (Due/Completed) */}
        {primaryDateStr && (
          <div className="flex justify-between items-center text-white font-medium">
            <span className="text-gray-500">{primaryLabel}:</span>
            <span className={`flex items-center gap-1 ${textColor}`}>
              {icon}
              {primaryDateStr
                ? new Date(primaryDateStr).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
        )}

        {/* Secondary Date (Created/Started/Expected) */}
        {secondaryDateStr && (
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-gray-500">{secondaryLabel}</span>
            <span className="text-gray-500">
              {secondaryDateStr
                ? new Date(secondaryDateStr).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
        )}
      </div>
    );
  };

  // --- UI RENDERING ---

  return (
    <div className="w-[85vw]  text-white"  id="todo">
      {editorTask && (
        <TodoEditorModal
          task={editorTask === "NEW" ? null : editorTask}
          onClose={() => setEditorTask(null)}
          onSave={() => {
            setEditorTask(null);
            loadTasks();
          }}
        />
      )}

      <div className="flex justify-between items-center mb-2 border-b border-[#303030] pb-2">
        <h3 className="text-xl font-bold h-full flex items-center self-end gap-2 text-white ">
          <ListTodo className="w-6 h-6 text-gray-400" /> Task Manager
        </h3>
        <button
          onClick={() => setEditorTask("NEW")}
          className="px-4 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition flex items-center gap-2 shadow-lg shadow-white/10"
        >
          <PlusCircle className="w-5 h-5" /> Add Task
        </button>
      </div>

      {isLoading ? (
        <div className="text-center p-10 text-gray-500">Loading tasks...</div>
      ) : (

        <DragDropContext onDragEnd={onDragEnd} >
            <div className="flex gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["TODO", "IN_PROGRESS", "DONE"].map((columnId: string) => {
              const column = columns[columnId as TodoStatus];
              const tasksInColumn = column.taskIds.map(
                (taskId) => tasks[taskId]
              );

              return (
                <Droppable droppableId={column.id} key={column.id}>
                  {(provided) => (
                    <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // 1. UPDATE: Set column to flex container (flex-col) and set a definite height/max-height
            className="bg-[#121212] rounded-xl p-2 border border-[#303030] shadow-xl h-[500px] w-[300px] flex flex-col" 
        >
                      <h4 className="text-md font-bold mb-4 border-b border-[#303030] pb-2 text-white flex-shrink-0">
                        {column.title}{" "}
                       <span
        className="ml-2 px-2  text-[#0a0a0a]" // Keep static classes here
        style={{
            // FIX: Apply the dynamic background color directly via style
            backgroundColor: CHART_COLORS[column.id] || CHART_COLORS['DEFAULT'],
        }}
    >
        {tasksInColumn.length}
    </span>
                      </h4>
<div className="flex-grow overflow-y-auto pr-1">
                      {tasksInColumn.map((task, index) => (
                        <Draggable
                          draggableId={task.id}
                          index={index}
                          key={task.id}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 mb-1 rounded-sm border transition-all duration-150 ${
                                snapshot.isDragging
                                  ? "bg-[#1D2330] border-white/50"
                                  : "bg-[#0a0a0a] border-[#303030]"
                              }`}
                            >
                              {/* Task Content */}
                              <div className="flex justify-between items-start">
                                <p className="font-semibold text-base leading-tight">
                                  {task.title}
                                </p>
                                <button
                                  onClick={() => setEditorTask(task)}
                                  className="text-gray-500 hover:text-white ml-2"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {task.description.substring(0, 50)}...
                                </p>
                              )}

                              {/* Date Info and Warning UI */}
                              {renderDateInfo(task)}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
           
          </div>
           <WeeklyTaskDistribution />
           </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default TodoKanban;
