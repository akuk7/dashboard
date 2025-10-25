// EditorModal.tsx

import React, { useState, useEffect } from 'react';
import { Save, Calendar, X, BookOpen } from 'lucide-react';
import supabase from '../lib/supabase';
import type { JournalEntry } from '../types/JournalTypes'; 


interface Props {
    entry: JournalEntry | null; // Null for new entry, object for editing
    onClose: () => void;
    onSave: (entry: JournalEntry, isNew: boolean) => void;
}

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const today = formatDate(new Date());

const EditorModal: React.FC<Props> = ({ entry, onClose, onSave }) => {
    const isNew = entry === null;
    
    const [editorContent, setEditorContent] = useState(''); 
    const [editorTitle, setEditorTitle] = useState('');
    const [entryDate, setEntryDate] = useState(today);

    useEffect(() => {
        if (!isNew && entry) {
            setEditorContent(entry.content_markdown);
            setEditorTitle(entry.title || '');
            setEntryDate(entry.entry_date);
        } else {
            // Reset state for new entry creation if component is reused
            setEditorContent('');
            setEditorTitle('');
            setEntryDate(today);
        }
    }, [entry, isNew]);

    const handleSave = async () => {
        if (editorContent.trim().length === 0) {
            alert('Journal content cannot be empty.');
            return;
        }

        const entryData = {
            title: editorTitle.trim() || null,
            content_html: editorContent, // Store Markdown in the HTML column
            entry_date: entryDate,
        };

        if (!isNew && entry) {
            // UPDATE existing entry
            const { data, error } = await supabase
                .from('journal_entries')
                .update(entryData)
                .match({ id: entry.id })
                .select('*')
                .single();

            if (error) {
                console.error('Error updating entry:', error);
                return;
            }
            onSave(data as JournalEntry, false);

        } else {
            // INSERT new entry
            const { data, error } = await supabase
                .from('journal_entries')
                .insert([entryData])
                .select('*')
                .single();

            if (error) {
                console.error('Error saving entry:', error);
                return;
            }

            onSave(data as JournalEntry, true);
        }
    };

    return (
        // Modal Backdrop
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {/* Modal Body */}
            <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-3xl p-6 border border-[#303030] shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col">
                
                <div className="flex justify-between items-center mb-4 border-b border-[#303030] pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        <BookOpen className="w-5 h-5 text-gray-400" /> {isNew ? 'Create New Entry' : 'Edit Entry'}
                    </h3>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Date and Title Input */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <input
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            className="bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-white transition"
                            max={today}
                        />
                    </div>
                    
                    <input
                        type="text"
                        placeholder="Optional Title for this entry"
                        value={editorTitle}
                        onChange={(e) => setEditorTitle(e.target.value)}
                        className="flex-grow bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 text-white placeholder-gray-500 transition"
                    />
                </div>
                
                {/* Markdown Editor (Scrollable Area) */}
                <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="Use **double asterisks** for bold, # for headers, and * for lists."
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg p-4 mb-4 text-white placeholder-gray-500 transition font-mono resize-none flex-grow overflow-y-auto"
                    rows={15}
                />
                
                {/* Save Button */}
                <div className="flex justify-end pt-3 border-t border-[#303030]">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition flex items-center gap-2 shadow-lg shadow-white/10"
                    >
                        <Save className="w-5 h-5" /> 
                        {isNew ? 'Save Entry' : 'Update Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditorModal;