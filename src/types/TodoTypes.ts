// TodoTypes.ts

export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface TodoTask {
    id: string;
    title: string;
    description: string | null;
    status: TodoStatus;
    
    expected_complete_at: string | null; // Date string (YYYY-MM-DD)
    work_started_at: string | null;      // ISO string
    completed_at: string | null;        // ISO string
    
    order_index: number;
    created_at: string;
}

export interface Column {
    id: TodoStatus;
    title: string;
    taskIds: string[];
}