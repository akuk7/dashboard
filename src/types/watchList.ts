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
  rank?: number | null;
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
  ranked: boolean;
}

// Interface for items in the Supabase 'watched_movies' table
export interface WatchedMovie {
  id: string;
  imdb_id: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  letterboxd_uri: string | null;
  created_at: string;
}