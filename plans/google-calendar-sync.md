# Google Calendar sync for todos

## Context
Todos with a due date should appear on Google Calendar without manual entry. One-way: todos -> Calendar.

## What changed
- Each todo with `expected_complete_at` is mirrored as an all-day, non-blocking event. DONE todos get a `✓` prefix. Clearing the date or deleting the todo removes the event.
- `gcal-sync` edge function, fired by a Database Webhook on `todos`, so every write path (editor, kanban drag, mobile, chat) is covered with no client changes.
- `gcal-auth` edge function: builds the consent URL, exchanges the OAuth code for a refresh token, reports status, disconnects.
- `src/lib/googleCalendar.ts` + a "Connect Google Calendar" button in the task header; `App.tsx` completes the OAuth redirect.

## Key decisions
- Own OAuth flow rather than Supabase's Google provider: login stays email/password; Calendar access is a separate, revocable grant.
- Auth-code flow with the exchange server-side, so the client secret and refresh token never reach the browser.
- `google_calendar_connection` has RLS enabled with no policies: only the service role can read the token.
- Scope is `calendar.events` only (least privilege).
- Webhook loop guard: `gcal-sync` writes `google_event_id` back, which re-fires the webhook; updates that change none of title/description/status/date are ignored.
- If an event is deleted in Calendar by hand, the next edit recreates it.

## Files
- supabase/migrations/20261113_google_calendar_sync.sql
- supabase/functions/gcal-auth/index.ts, supabase/functions/gcal-sync/index.ts
- src/lib/googleCalendar.ts, src/App.tsx, src/components/TodoKanban.tsx

## Verification
- `tsc -b` passes.
- Manual: connect, create/edit/complete/delete a todo, confirm the event follows. Mobile kanban header has no connect button yet (desktop only).
