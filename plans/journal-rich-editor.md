# Journal rich-text editor

## Context
The journal modal was a plain `<textarea>` where entries were typed as markdown and rendered with `react-markdown`. Writing markup by hand is poor UX and the editor had no tables or images.

## What changed
- Replaced the textarea with a Tiptap v3 editor (`StarterKit`, `TableKit`, `Image`, `Placeholder`) with a toolbar: bold, italic, H1/H2, bullet/numbered lists, quote, table (insert, add/delete row/column, delete table), image, undo/redo.
- Entries are now stored as sanitized HTML in the existing `journal_entries.content_html` column (no schema change).
- Images are uploaded to a new public Supabase Storage bucket `journal-images` (toolbar button, paste, drag-drop); the public URL is embedded in the HTML, never base64.
- Legacy markdown entries are detected on load and converted to HTML with `marked`; they are rewritten as HTML only when the entry is saved.
- Viewer renders sanitized HTML (DOMPurify) with a shared `.journal-content` stylesheet (the previous `prose` classes had no effect: `@tailwindcss/typography` is not installed).
- Search now matches plain text extracted from the HTML rather than raw markup; the empty-entry check treats `<p></p>` as empty (an image or table counts as content).
- `JournalEntry.content_markdown` renamed to `content`; removed `react-markdown` and `remark-gfm`.

## Key decisions
- Tiptap over Lexical/BlockNote/Milkdown: free MIT core with first-party table and image support, headless so it matches the existing dark UI.
- Lazy conversion of old entries instead of a bulk migration: no data rewrite risk.
- Public bucket for simplicity; writes restricted to authenticated users, same access model as other tables.

## Files
- New: `src/components/journal/RichEditor.tsx`, `src/lib/journalContent.ts`, `supabase/migrations/20261110_journal_images_bucket.sql`
- Modified: `src/models/EditorModel.tsx`, `src/models/ViewerModel.tsx`, `src/components/DigitalJournal.tsx`, `src/types/JournalTypes.ts`, `src/index.css`, `package.json`, `package-lock.json`

## Verification
- `npx tsc -b`, `npm run lint` (journal files) and `npm run build` pass.
- Still to do manually: apply the migration, then create/edit an entry with a list, table and pasted image, reopen it, and open an old markdown entry.
