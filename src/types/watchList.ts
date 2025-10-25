// WatchlistTypes.ts

export type WatchlistCategoryName = string;

// Interface for items saved in your Supabase 'watchlist' table
export interface WatchlistItem {
  db_id: string; 
  id: string; // OMDb/IMDb ID (used for uniqueness)
  title: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv'; // Stored type
  category: WatchlistCategoryName;
  created_at: string;
}

// Interface for results returned by the OMDb API search
export interface OmdbResult {
  Title: string;
  Year: string;
  imdbID: string; // This is the ID we'll use for storage
  Type: 'movie' | 'series' | 'game' | string; // OMDb uses 'series' instead of 'tv'
  Poster: string;
}

// OMDb search response is an array of OmdbResult inside a Search property
export interface OmdbSearchResponse {
    Search?: OmdbResult[];
    Response: string; // "True" or "False"
}

// Interface for the dynamic categories table (No change needed here)
export interface Category {
    id: string; 
    name: WatchlistCategoryName;
}