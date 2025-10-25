import React, { useState, useEffect } from 'react';
import { X, Save,  Trash2 } from 'lucide-react';
import supabase from '../lib/supabase';
import type { TodoTask, TodoStatus } from '../types/TodoTypes';

interface Props {
    task: TodoTask | null; // Null for new task, object for editing
    onClose: () => void;
    onSave: () => void; // Parent component reloads data after save
}

const formatDate = (d: Date | string) => {
    // Ensure date is in YYYY-MM-DD format for input type="date"
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    return dateObj.toISOString().split('T')[0];
};

const TodoEditorModal: React.FC<Props> = ({ task, onClose, onSave }) => {
    const isEditing = task !== null;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [expectedCompleteAt, setExpectedCompleteAt] = useState(formatDate(new Date()));
    const [status, setStatus] = useState<TodoStatus>('TODO');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            // Only set expected date if it exists
            if (task.expected_complete_at) {
                 setExpectedCompleteAt(formatDate(task.expected_complete_at));
            }
            setStatus(task.status);
        } else {
            // Reset for new task
            setTitle('');
            setDescription('');
            setExpectedCompleteAt(formatDate(new Date()));
            setStatus('TODO');
        }
    }, [task]);

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Title is required.');
            return;
        }

        // Prepare object for Supabase
        const taskData = {
            title: title.trim(),
            description: description.trim() || null,
            expected_complete_at: expectedCompleteAt,
            status: status,
        };

        if (isEditing && task) {
            // UPDATE
            const { error } = await supabase
                .from('todos')
                .update(taskData)
                .match({ id: task.id });

            if (error) {
                console.error('Error updating task:', error);
                return;
            }
        } else {
            // INSERT (order_index is placeholder for simplicity; realistic app needs to calculate last index)
            const { error } = await supabase
                .from('todos')
                .insert([{ ...taskData, order_index: 0 }]); 

            if (error) {
                console.error('Error creating task:', error);
                return;
            }
        }

        onSave(); // Close modal and trigger parent reload
    };
    
    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        
        if (task) {
            const { error } = await supabase.from('todos').delete().match({ id: task.id });
            if (error) {
                console.error('Error deleting task:', error);
                return;
            }
            onSave();
        }
    };

    return (
        // Modal Backdrop
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-lg p-6 border border-[#303030] shadow-2xl shadow-black/50">
                
                <div className="flex justify-between items-center mb-4 border-b border-[#303030] pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        {isEditing ? 'Edit Task' : 'New Task'}
                    </h3>
                    <div className="flex gap-2">
                        {isEditing && (
                            <button onClick={handleDelete} className="text-gray-500 hover:text-red-500 transition">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Status Selection (only visible if editing) */}
                {isEditing && (
                    <div className="mb-4">
                        <label className="block mb-1 text-sm text-gray-400">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TodoStatus)}
                            className="w-full bg-[#0A0A0A] border border-[#303030] rounded-lg px-4 py-2 text-white transition"
                        >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                        </select>
                    </div>
                )}
                
                <label className="block mb-1 text-sm text-gray-400">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 mb-4 text-white transition"
                    placeholder="Task Title"
                />

                <label className="block mb-1 text-sm text-gray-400">Description (Optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 mb-4 text-white placeholder-gray-500 transition resize-y"
                    rows={3}
                    placeholder="Details about the task..."
                />
                
                <label className="block mb-1 text-sm text-gray-400">Expected Completion Date</label>
                <input
                    type="date"
                    value={expectedCompleteAt}
                    onChange={(e) => setExpectedCompleteAt(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 mb-6 text-white transition"
                />

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition flex items-center gap-2 shadow-lg shadow-white/10"
                    >
                        <Save className="w-5 h-5" /> 
                        {isEditing ? 'Save Changes' : 'Create Task'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TodoEditorModal;