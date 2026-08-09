import { useEffect, useMemo, useState } from 'react'
import { Search, X, Trash2, Tag, PlusCircle, LayoutGrid } from 'lucide-react'
import supabase from '../../lib/supabase'
import type {
  WatchlistItem,
  WatchlistCategoryName,
  Category,
  OmdbResult,
  OmdbSearchResponse,
} from '../../types/watchList'
import CategoryModal from '../../models/CategoryModel'
import MobileHeader from '../MobileHeader'
import MobileWatchedGrid from './MobileWatchedGrid'

const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY
const BASE_CATEGORY = 'General'

const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await supabase
    .from('watchlist_categories')
    .select('id, name, ranked')
    .order('created_at', { ascending: false })

  const userCategories = ((data as { id: string; name: string; ranked: boolean | null }[]) || []).map((c) => ({
    id: c.id,
    name: c.name,
    ranked: c.ranked ?? false,
  }))
  const uniqueUserCategories = userCategories.filter((uc) => uc.name !== BASE_CATEGORY)

  return [{ id: BASE_CATEGORY, name: BASE_CATEGORY, ranked: false }, ...uniqueUserCategories]
}

const createCategory = async (name: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('watchlist_categories')
    .insert([{ name: name.trim() }])
    .select('id, name, ranked')
    .single()
  if (error) {
    console.error('Error creating category:', error)
    return null
  }
  return { ...data, ranked: data.ranked ?? false } as Category
}

const searchOmdb = async (query: string): Promise<OmdbResult[]> => {
  if (!query || query.length < 3 || !OMDB_API_KEY) return []
  const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`
  try {
    const response = await fetch(url)
    const data: OmdbSearchResponse = await response.json()
    if (data.Response === 'True' && data.Search) {
      return data.Search.filter(
        (item) => (item.Type === 'movie' || item.Type === 'series') && item.Poster !== 'N/A'
      ).slice(0, 5)
    }
    return []
  } catch (error) {
    console.error('Error searching OMDb:', error)
    return []
  }
}

const MobileWatchlist: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<OmdbResult[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<WatchlistCategoryName>(BASE_CATEGORY)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showWatchedGrid, setShowWatchedGrid] = useState(false)

  const loadData = async () => {
    const cats = await fetchCategories()
    setCategories(cats)
    const { data } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false })
    setWatchlist((data as WatchlistItem[]) || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm.length > 2) {
        searchOmdb(searchTerm).then(setSearchResults)
      } else {
        setSearchResults([])
      }
    }, 500)
    return () => clearTimeout(delay)
  }, [searchTerm])

  const filteredWatchlist = useMemo(() => {
    let list = watchlist
    if (selectedCategory !== BASE_CATEGORY) {
      list = watchlist.filter((item) => item.category === selectedCategory)
    }
    const currentCategory = categories.find((c) => c.name === selectedCategory)
    if (currentCategory?.ranked) {
      return [...list].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    }
    return list
  }, [watchlist, selectedCategory, categories])

  const handleAddToWatchlist = async (item: OmdbResult, category: WatchlistCategoryName) => {
    if (watchlist.some((w) => w.id === item.imdbID)) {
      alert('Item is already in your watchlist!')
      return
    }
    const newItem: Omit<WatchlistItem, 'db_id'> = {
      id: item.imdbID,
      title: item.Title,
      poster_path: item.Poster !== 'N/A' ? item.Poster : null,
      media_type: item.Type === 'series' ? 'tv' : (item.Type as 'movie' | 'tv'),
      category,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('watchlist').insert([newItem]).select('*').single()
    if (error) {
      console.error('Error adding item:', error)
      return
    }
    setWatchlist((prev) => [data as WatchlistItem, ...prev])
    setSearchTerm('')
    setSearchResults([])
  }

  const handleDelete = async (db_id: string) => {
    const { error } = await supabase.from('watchlist').delete().match({ db_id })
    if (error) {
      console.error('Error deleting item:', error)
      return
    }
    setWatchlist((prev) => prev.filter((item) => item.db_id !== db_id))
  }

  const handleCreateCategory = async (name: string) => {
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Category already exists!')
      return
    }
    const newCat = await createCategory(name)
    if (newCat) {
      setCategories((prev) => [newCat, ...prev.filter((c) => c.name !== newCat.name)])
      setSelectedCategory(newCat.name)
    }
    setShowCategoryModal(false)
  }

  return (
    <div className="w-full pb-24">
      <MobileHeader
        title="WatchList"
        action={
          <button
            onClick={() => setShowWatchedGrid(true)}
            className="text-gray-300 hover:text-white transition"
            aria-label="View watched grid"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 pt-4 min-w-0">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search movies & TV..."
            className="w-full bg-[#121212] border border-[#303030] focus:border-white rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSearchResults([])
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mb-4 bg-[#121212] border border-[#303030] rounded-xl overflow-hidden">
            {searchResults.map((result) => (
              <div
                key={result.imdbID}
                className="flex items-center gap-3 p-3 border-b border-[#303030] last:border-b-0"
              >
                {result.Poster !== 'N/A' && (
                  <img src={result.Poster} alt={result.Title} className="w-10 h-auto rounded-sm flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {result.Title} ({result.Year})
                  </p>
                  <p className="text-xs text-gray-500">{result.Type.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => handleAddToWatchlist(result, selectedCategory)}
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium flex-shrink-0"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x mb-4 -mx-4 px-4 pb-1 no-scrollbar">
          <div className="flex items-center gap-2 w-max">
            <button
              onClick={() => setSelectedCategory(BASE_CATEGORY)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 ${
                selectedCategory === BASE_CATEGORY ? 'bg-white text-black' : 'bg-[#121212] text-gray-300 border border-[#303030]'
              }`}
            >
              General
            </button>
            {categories
              .filter((c) => c.name !== BASE_CATEGORY)
              .map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 ${
                    selectedCategory === cat.name
                      ? 'bg-white text-black'
                      : 'bg-[#121212] text-gray-300 border border-[#303030]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-3 py-1.5 rounded-full text-sm text-gray-300 border border-[#303030] flex items-center gap-1 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {filteredWatchlist.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No items in this category.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredWatchlist.map((item) => (
              <div key={item.db_id} className="flex items-center gap-3 p-3 bg-[#121212] border border-[#303030] rounded-xl">
                {item.poster_path && (
                  <img src={item.poster_path} alt={item.title} className="w-14 h-auto rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 mb-1">{item.media_type.toUpperCase()}</p>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-300">{item.category}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.db_id)} className="text-gray-600 hover:text-red-500 p-1 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCategoryModal && (
        <CategoryModal onClose={() => setShowCategoryModal(false)} onCreate={handleCreateCategory} />
      )}
      {showWatchedGrid && <MobileWatchedGrid onClose={() => setShowWatchedGrid(false)} />}
    </div>
  )
}

export default MobileWatchlist
