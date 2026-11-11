# Chat assistant: log transactions, todos and habits

## Context
Logging an entry means opening a form per entity. This adds one chat box where a message such as
`credit 250 alfahm food` (typed or spoken) becomes a structured record shown as an approval card.
The record is written to Supabase only after **Approve** is pressed.

## What changed
- A floating chat widget, mounted for signed-in users on desktop and mobile.
- A single conversation stored in `localStorage` (`dashboard.chat.v1`, last 100 messages), with a clear-chat button.
- Edge Function `chat-parse`: sends the message plus live lists (accounts, categories, todo categories, active habits,
  open loans, today's IST date) to Gemini 3.5 Flash-Lite with a JSON response schema. The model name can be
  overridden with a `GEMINI_MODEL` secret, since Google retires models (2.5 Flash-Lite was already unavailable to new
  users when this was first tried).
- Edge Function `chat-transcribe`: forwards a recorded clip to Groq `whisper-large-v3-turbo`. The transcript lands in the
  input box, so it can be edited before sending.
- API keys live in Supabase secrets, not in the client bundle.

## Key decisions
- **The model never writes to the database.** It returns `actions[]`; the client inserts on Approve using the same
  payload shapes as `AddTransaction`, `TodoEditorModel` and `HabitTracker`.
- **Ids behind, names in front.** The model picks ids from the lists it was given; the card shows names resolved from
  those same lists.
- **Server-side validation** of every action (ids exist in the supplied context, amount > 0, type allowed, transfer
  accounts differ, loan link present for repayments and top-ups). Failures become a clarifying question, not a card.
- **Accounts are the payment method.** In `credit 250 alfahm food`, `alfahm` is an account and `food` a category.
- Chat-created lends are small personal loans (`is_temporary = true`); top-ups inherit the status of their loan.
  Big loans/arrears are still entered through the form.
- Editing a card is not supported; dismiss it and send a corrected message.
- **Live refresh after Approve.** `commitAction` dispatches a `chat:record-created` window event carrying the record
  kind. The `useRecordCreated` hook subscribes in each view that owns the data, which reloads itself: `Transactions`,
  `TodoKanban` (plus its weekly chart), `Habits` (via its existing refresh token), and the mobile
  `MobileTransactions`, `MobileKanban`, `MobileHabits`. The desktop transactions reload is silent (no loading flash).

## Files
- `supabase/functions/chat-parse/index.ts`, `chat-transcribe/index.ts` (each is a single self-contained file, so it
  can also be pasted into the dashboard editor)
- `src/components/chat/ChatWidget.tsx`, `ActionCard.tsx`
- `src/lib/chat/useChat.ts`, `context.ts`, `commit.ts`, `useVoiceRecorder.ts`, `useRecordCreated.ts`
- Refresh listeners added to `Transactions.tsx`, `TodoKanban.tsx`, `Habits.tsx` and the three mobile views
- `src/types/chat.ts`
- `src/App.tsx` (mounts the widget)

## Setup
```
supabase login
supabase link --project-ref <ref>
supabase secrets set GEMINI_API_KEY=<key> GROQ_API_KEY=<key>
supabase functions deploy chat-parse
supabase functions deploy chat-transcribe
```
Both functions keep JWT verification on, so only signed-in users can call them.
The loan top-up check migrations in `supabase/migrations/` must be applied, or top-up inserts fail with error 23514.

## Verification
- `tsc -b` and eslint pass on the touched files.
- To check manually after deploy: `credit 250 alfahm food`, a transfer, a lend, a repayment, `todo buy milk tomorrow`,
  `did gym today`, and an ambiguous message (expect a clarifying question). Approve each and confirm the row; Dismiss
  must write nothing.
- With the transactions, todos and habits views open, approve a card of each kind and confirm the view updates
  without a reload (desktop and mobile).
- Reload to confirm history persists; clear chat to confirm it stays empty after reload.
- Record a short clip and confirm the transcript appears in the input.
- Confirm no key appears in the built `dist/` output.
- Free-tier limits for both providers change often; check the Google AI Studio and Groq consoles for the real quotas.
