// CategoryModal.tsx

import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';

interface Props {
    onClose: () => void;
    onCreate: (name: string) => void;
}

const CategoryModal: React.FC<Props> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
        }
    };

    return (
        // Dark backdrop
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            {/* Modal card style: dark background, subtle border */}
            <div className="bg-[#121212] text-gray-100 rounded-xl w-full max-w-sm p-6 border border-[#303030] shadow-2xl shadow-black/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                        <PlusCircle className="w-5 h-5 text-gray-400" /> New Category
                    </h3>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <label className="block mb-2 text-sm font-medium text-gray-300">Category Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 mb-4 text-white placeholder-gray-500 transition"
                    placeholder="e.g. Action Movies"
                />

                <div className="flex justify-end gap-3 pt-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 rounded-lg bg-transparent text-gray-400 hover:text-white transition border border-transparent hover:border-[#303030]"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleCreate} 
                        disabled={!name.trim()}
                        className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryModal;