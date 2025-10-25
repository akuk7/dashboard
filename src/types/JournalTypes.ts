// JournalTypes.ts

export interface JournalEntry {
  id: string; 
    title: string | null;
    content_markdown: string; 
    entry_date: string; 
    created_at: string;
}