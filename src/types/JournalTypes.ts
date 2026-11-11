// JournalTypes.ts

export interface JournalEntry {
  id: string; 
    title: string | null;
    content: string; // HTML (legacy entries may still be markdown; see lib/journalContent.ts)
    entry_date: string; 
    created_at: string;
}