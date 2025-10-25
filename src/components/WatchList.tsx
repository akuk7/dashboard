import React, { useState, useEffect, useMemo } from 'react';
import { Search,  Trash2, Tag, PlusCircle, X,  Clapperboard } from 'lucide-react'; 
import supabase from '../lib/supabase';
import type { WatchlistItem, WatchlistCategoryName, Category, OmdbResult, OmdbSearchResponse } from '../types/watchList'; 
import CategoryModal from '../models/CategoryModel';

// --- CONFIGURATION ---
const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY; 
const BASE_CATEGORY = 'General';
const DEFAULT_CATEGORIES = [BASE_CATEGORY, 'Must Watch', 'Later', 'Kids'];

// --- DATA ACCESS FUNCTIONS (defined here for completeness) ---

const fetchCategories = async (): Promise<Category[]> => {
    const { data } = await supabase.from('watchlist_categories').select('id, name').order('created_at', { ascending: false });
    
    const userCategories = (data as Category[] || []).map(c => ({ id: c.id, name: c.name }));

    const defaultCategoryObjects: Category[] = DEFAULT_CATEGORIES.map(name => ({ 
        id: name,
        name 
    }));

    const uniqueUserCategories = userCategories.filter(uc => 
        !DEFAULT_CATEGORIES.includes(uc.name)
    );
    
    const combinedCategories: Category[] = [
        ...defaultCategoryObjects,
        ...uniqueUserCategories
    ];
    
    return combinedCategories;
};

const createCategory = async (name: string): Promise<Category | null> => {
    if (name.trim().length === 0) return null;
    const newCategory = { name: name.trim() };
    const { data, error } = await supabase.from('watchlist_categories').insert([newCategory]).select('id, name').single();
    if (error) {
        console.error('Error creating category:', error);
        return null;
    }
    return data as Category;
};

const searchOmdb = async (query: string): Promise<OmdbResult[]> => {
    if (!query || query.length < 3 || !OMDB_API_KEY) return [];
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`;
    try {
        const response = await fetch(url);
        const data: OmdbSearchResponse = await response.json();
        
        if (data.Response === "True" && data.Search) {
            return data.Search.filter(item => 
                (item.Type === 'movie' || item.Type === 'series') && item.Poster !== 'N/A'
            ).slice(0, 5) as OmdbResult[]; 
        }
        return [];
    } catch (error) {
        console.error("Error searching OMDb:", error);
        return [];
    }
};

const deleteWatchlistItem = async (db_id: string) => {
    const { error } = await supabase.from('watchlist').delete().match({ db_id });
    if (error) console.error('Error deleting item:', error);
    return !error;
};

// --- COMPONENT START ---

const Watchlist: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<OmdbResult[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<WatchlistCategoryName>(BASE_CATEGORY); 
    const [isLoading, setIsLoading] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false); 

    const filteredWatchlist = useMemo(() => {
        if (selectedCategory === BASE_CATEGORY) return watchlist;
        return watchlist.filter(item => item.category === selectedCategory);
    }, [watchlist, selectedCategory]);

    const loadData = async () => {
        setIsLoading(true);
        const cats = await fetchCategories();
        setCategories(cats);
        const { data } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false });
        setWatchlist((data as WatchlistItem[]) || []);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateCategoryFromModal = async (name: string) => {
        const existing = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            alert('Category already exists!');
            return;
        }

        const newCat = await createCategory(name);
        if (newCat) {
            setCategories(prev => [newCat, ...prev.filter(c => c.name !== newCat.name)]);
            setSelectedCategory(newCat.name);
        }
        setShowCategoryModal(false);
    };

    // Handler to clear the search bar and results
    const handleClearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchTerm.length > 2) {
                searchOmdb(searchTerm).then(setSearchResults);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleAddToWatchlist = async (item: OmdbResult, category: WatchlistCategoryName) => {
        if (watchlist.some(w => w.id === item.imdbID)) {
            alert('Item is already in your watchlist!');
            return;
        }

        const newWatchlistItem: Omit<WatchlistItem, 'db_id'> = {
            id: item.imdbID,
            title: item.Title,
            poster_path: item.Poster !== 'N/A' ? item.Poster : null,
            media_type: item.Type === 'series' ? 'tv' : (item.Type as 'movie' | 'tv'), 
            category: category,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from('watchlist').insert([newWatchlistItem]).select('*').single();

        if (error) {
            console.error('Error adding item:', error);
            return;
        }
        
        setWatchlist(prev => [data as WatchlistItem, ...prev]);
        setSearchTerm('');
        setSearchResults([]);
    };
    
    const handleDelete = async (db_id: string) => {
        const success = await deleteWatchlistItem(db_id);
        if (success) {
            setWatchlist(prev => prev.filter(item => item.db_id !== db_id));
        }
    };

    return (
        <div className="p-6 bg-[#0A0A0A] rounded-xl text-gray-100 min-h-screen">
            {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} onCreate={handleCreateCategoryFromModal} />}

             <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white border-b border-[#303030] pb-3">
                <Clapperboard className="w-6 h-6 text-gray-400" /> Movie Watchlist
            </h3>

            {/* --- SEARCH BAR CONTAINER (relative for absolute results) --- */}
            <div className="mb-8  rounded-xl border border-[#303030] relative z-20">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search for a movie or TV show..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        // Adjusted padding for icons/buttons
                        className="w-full bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-4 py-2 pl-12 pr-12 text-white placeholder-gray-500 transition" 
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />

                    {/* Clear Search Button (NEW) */}
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition"
                            aria-label="Clear search"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                
                {/* --- SEARCH RESULTS OVERLAY (Absolute position, floating over content below) --- */}
                {searchResults.length > 0 && (
                    <div 
                        className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-[#1D2330] rounded-lg border border-[#303030] max-h-80 overflow-y-auto z-30 shadow-2xl shadow-black/50"
                        style={{ width: 'calc(100% - 32px)' }} // Matches parent padding width
                    >
                        {searchResults.map(result => (
                            <div 
                                key={result.imdbID} 
                                className="flex items-center justify-between p-3 border-b border-[#303030] hover:bg-[#303030] transition"
                            >
                                <div className="flex items-center gap-3">
                                    {result.Poster !== 'N/A' && (
                                        <img 
                                            src={result.Poster} 
                                            alt={result.Title} 
                                            className="w-10 h-auto rounded-sm"
                                        />
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold">{result.Title} ({result.Year})</p>
                                        <p className="text-xs text-gray-400">{result.Type.toUpperCase()}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedCategory} 
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="bg-[#0A0A0A] border border-[#303030] rounded-lg px-2 py-1 text-sm text-gray-300"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleAddToWatchlist(result, selectedCategory)}
                                        className="px-3 py-1 rounded-lg bg-white text-black text-sm hover:bg-gray-200 transition"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- WATCHLIST DISPLAY HEADER --- */}
            <div className="flex justify-between items-center mb-4 border-b border-[#303030] pb-2">
                <div className="flex items-center gap-3">
                    <h4 className="text-xl font-bold text-white">My List ({filteredWatchlist.length})</h4>
                    
                    {/* Filter Dropdown */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-[#1D2330] border border-[#303030] rounded-lg px-3 py-1 text-sm text-gray-300 transition"
                    >
                        <option value={BASE_CATEGORY}>All Categories</option>
                        {categories.filter(c => c.name !== BASE_CATEGORY).map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                
                {/* Create Category Button */}
                <button 
                    onClick={() => setShowCategoryModal(true)}
                    className="px-3 py-1 rounded-lg bg-[#1D2330] text-gray-300 hover:bg-[#303030] transition border border-[#303030] flex items-center gap-1 text-sm"
                >
                    <PlusCircle className="w-4 h-4" /> Category
                </button>
            </div>
            
            {/* --- WATCHLIST ITEMS --- */}
            {isLoading && <p className="text-gray-400">Loading watchlist...</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWatchlist.map(item => (
                    <div 
                        key={item.db_id} 
                        className="flex items-start p-4 bg-[#121212] rounded-xl border border-[#303030] shadow-md transition-all hover:border-white/50"
                    >
                        {item.poster_path && (
                            <img 
                                src={item.poster_path} 
                                alt={item.title} 
                                className="w-16 h-auto rounded-md mr-4 flex-shrink-0"
                            />
                        )}
                        <div className="flex-grow">
                            <p className="text-lg font-bold text-white mb-1">{item.title}</p>
                            <p className="text-xs text-gray-500 mb-2">{item.media_type.toUpperCase()}</p>
                            
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-300">{item.category}</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => handleDelete(item.db_id)}
                            className="text-gray-600 hover:text-red-500 p-1 rounded-full transition ml-4"
                            title="Remove from watchlist"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
            
            {filteredWatchlist.length === 0 && !isLoading && (
                <p className="text-gray-400 mt-4">Your watchlist is empty. Start searching above!</p>
            )}
        </div>
    );
};

export default Watchlist;