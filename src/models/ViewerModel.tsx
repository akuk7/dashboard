// EntryViewerModal.tsx

import React from 'react';
import { Edit, X, Calendar } from 'lucide-react';
import type { JournalEntry } from '../types/JournalTypes'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
    entry: JournalEntry;
    onClose: () => void;
    onEdit: () => void;
}

const EntryViewerModal: React.FC<Props> = ({ entry, onClose, onEdit }) => {
    return (
        // Modal Backdrop
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ">
            {/* Modal Body */}
            <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-3xl p-6 border border-[#303030] shadow-2xl shadow-black/50  min-h-[500px] max-h-[90vh] flex flex-col">
                
                <div className="flex justify-between items-start mb-4 border-b border-[#303030] pb-3">
                    <div className="flex flex-col">
                         <h3 className="text-2xl font-extrabold text-white leading-tight">
                            {entry.title || 'Untitled Entry'}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(entry.entry_date).toLocaleDateString()}
                        </p>
                    </div>
                   
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="text-gray-500 hover:text-white p-1 rounded-full transition" title="Edit Entry">
                            <Edit className="w-6 h-6" />
                        </button>
                        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Rendered Markdown Content */}
                <div className="text-base text-gray-300 overflow-y-auto flex-grow prose prose-invert max-w-none">
                    <ReactMarkdown 
                        children={entry.content_markdown}
                        remarkPlugins={[remarkGfm]}
                    />
                </div>
            </div>
        </div>
    );
};

export default EntryViewerModal;