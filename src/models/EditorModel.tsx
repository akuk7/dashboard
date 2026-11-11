// EditorModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Save, Calendar, X, BookOpen } from 'lucide-react';
import supabase from '../lib/supabase';
import RichEditor from '../components/journal/RichEditor';
import { toHtml, sanitize, isEmptyContent } from '../lib/journalContent';
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
    
    const [editorTitle, setEditorTitle] = useState('');
    const [entryDate, setEntryDate] = useState(today);

    // Legacy markdown entries are converted to HTML once, here; saving rewrites them as HTML.
    const initialHtml = useMemo(() => (entry ? toHtml(entry.content) : ''), [entry]);
    const [editorContent, setEditorContent] = useState(initialHtml);

    useEffect(() => {
        setEditorTitle(entry?.title || '');
        setEntryDate(entry?.entry_date ?? today);
    }, [entry]);

    const handleSave = async () => {
        if (isEmptyContent(editorContent)) {
            alert('Journal content cannot be empty.');
            return;
        }

        const entryData = {
            title: editorTitle.trim() || null,
            content_html: sanitize(editorContent),
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
            <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-5xl p-6 border border-[#303030] shadow-2xl shadow-black/50 h-[92vh] flex flex-col">
                
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
                
                {/* Rich text editor (scrolls internally) */}
                <RichEditor initialHtml={initialHtml} onChange={setEditorContent} />

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