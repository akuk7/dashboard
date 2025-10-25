import React, { useState, useEffect, useMemo } from 'react';
import {  Edit, Trash2, Calendar, BookOpen, Search, PlusCircle,  Eye } from 'lucide-react';
import supabase from '../lib/supabase';



// --- Component Imports ---
import EditorModal from '../models/EditorModel';
import EntryViewerModal from '../models/ViewerModel';
import type { JournalEntry } from '../types/JournalTypes';

interface RawJournalRow {
    id: string;
    title: string | null;
    content_html: string;
    entry_date: string;
    created_at: string;
}

// --- CONFIGURATION & UTILITIES ---

const fetchEntries = async (): Promise<JournalEntry[]> => {
    // ... (supabase query and error check remains the same)
    const { data, error } = await supabase
        .from('journal_entries')
        .select('id, title, content_html, entry_date, created_at')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching entries:", error);
        return [];
    }

    // Safely cast the data to an array of RawJournalRow
    const rawData = (data as RawJournalRow[]) || [];

    // FIX: Map rawData, typing the row argument with RawJournalRow
    const entries = rawData.map((row: RawJournalRow) => ({
        id: row.id,
        title: row.title,
        // Perform the required aliasing/renaming here
        content_markdown: row.content_html, 
        entry_date: row.entry_date,
        created_at: row.created_at,
    }));
    
    return entries;
};

// --- COMPONENT START ---

const DigitalJournal: React.FC = () => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
    
    // Modal States
    const [editorEntry, setEditorEntry] = useState<JournalEntry | 'NEW' | null>(null);
    const [viewerEntry, setViewerEntry] = useState<JournalEntry | null>(null);

    useEffect(() => {
        const loadEntries = async () => {
            setIsLoading(true);
            const data = await fetchEntries();
            setEntries(data);
            setIsLoading(false);
        };
        loadEntries();
    }, []);

    // --- CRUD and Data Handlers ---

    const handleSaveEntry = (savedEntry: JournalEntry, isNew: boolean) => {
        if (isNew) {
            setEntries(prev => [savedEntry, ...prev]);
        } else {
            setEntries(prev => prev.map(e => e.id === savedEntry.id ? savedEntry : e));
        }
        setEditorEntry(null); // Close modal
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this journal entry?')) return;

        const { error } = await supabase.from('journal_entries').delete().match({ id });
        
        if (error) {
            console.error('Error deleting entry:', error);
            return;
        }

        setEntries(prev => prev.filter(e => e.id !== id));
    };

    // --- Filtering and Sorting ---

    const filteredAndSortedEntries = useMemo(() => {
        let list = entries;

        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            list = list.filter(entry =>
                (entry.title?.toLowerCase().includes(lowerCaseSearch) || 
                 entry.content_markdown.toLowerCase().includes(lowerCaseSearch))
            );
        }

        if (sortBy === 'title') {
            list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else {
            list.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
        }

        return list;
    }, [entries, searchTerm, sortBy]);


    // --- UI RENDERING ---

    return (
        <div className="p-6 bg-[#0A0A0A] rounded-xl text-gray-100 min-h-screen">
            {/* 1. EDITOR MODAL */}
            {(editorEntry === 'NEW' || (editorEntry && typeof editorEntry === 'object')) && (
                <EditorModal 
                    entry={editorEntry === 'NEW' ? null : editorEntry} 
                    onClose={() => setEditorEntry(null)} 
                    onSave={handleSaveEntry} 
                />
            )}
            
            {/* 2. VIEWER MODAL */}
            {viewerEntry && (
                <EntryViewerModal 
                    entry={viewerEntry} 
                    onClose={() => setViewerEntry(null)} 
                    onEdit={() => {
                        setEditorEntry(viewerEntry); // Open editor with current content
                        setViewerEntry(null); // Close viewer
                    }}
                />
            )}

            <h3 className="text-3xl font-extrabold text-white tracking-tight mb-8 border-b border-[#303030] pb-4 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-gray-400" /> Digital Journal
            </h3>

            {/* --- JOURNAL LIST CONTROLS --- */}
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold text-white">Previous Entries ({filteredAndSortedEntries.length})</h4>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setEditorEntry('NEW')}
                        className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition flex items-center gap-2 shadow-lg shadow-white/10"
                    >
                        <PlusCircle className="w-5 h-5" /> Add Journal
                    </button>
                </div>
            </div>

            {/* Filters and Sort */}
            <div className="flex justify-between items-center mb-6 p-3 bg-[#121212] rounded-xl border border-[#303030]">
                <div className="relative flex-grow max-w-sm">
                    <input
                        type="text"
                        placeholder="Search title or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-1 pl-9 text-sm text-gray-300 transition"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
                
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'title')}
                    className="bg-[#1D2330] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300 transition"
                >
                    <option value="date">Sort by Date</option>
                    <option value="title">Sort by Title</option>
                </select>
            </div>


            {/* --- JOURNAL LIST --- */}
            {isLoading && <p className="text-gray-400">Loading entries...</p>}
            
            <div className="space-y-3">
                {filteredAndSortedEntries.map(entry => (
                    <div 
                        key={entry.id} 
                        className="flex justify-between items-center p-4 bg-[#121212] rounded-xl border border-[#303030] shadow-md hover:border-gray-500 transition"
                    >
                        {/* Title and Date (Clickable Area for Viewer) */}
                        <div 
                            className="flex flex-col flex-grow cursor-pointer pr-4"
                            onClick={() => setViewerEntry(entry)}
                        >
                            <h5 className="text-lg font-bold text-white leading-tight">
                                {entry.title || 'Untitled Entry'}
                            </h5>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(entry.entry_date).toLocaleDateString()}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                             <button
                                onClick={() => setViewerEntry(entry)}
                                className="text-gray-500 hover:text-green-400 p-1 rounded-full transition"
                                title="View Content"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setEditorEntry(entry)}
                                className="text-gray-500 hover:text-white p-1 rounded-full transition"
                                title="Edit"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-gray-500 hover:text-red-500 p-1 rounded-full transition"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAndSortedEntries.length === 0 && !isLoading && (
                <p className="text-gray-400 mt-4">No journal entries found. Click "Add Journal" to start.</p>
            )}
        </div>
    );
};

export default DigitalJournal;