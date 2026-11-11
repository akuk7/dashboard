-- Google Calendar sync for todos (one-way: todos -> Calendar).
--
-- todos.google_event_id remembers which Calendar event mirrors a todo so edits update it in place.
-- google_calendar_connection holds the OAuth refresh token. It is a single-user app, so the table
-- holds at most one row (id = 1). RLS is enabled with NO policies on purpose: the anon/authenticated
-- roles can never read the token; only the edge functions (service role) touch this table.

alter table todos add column if not exists google_event_id text;

create table if not exists google_calendar_connection (
  id int primary key default 1 check (id = 1),
  refresh_token text not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now()
);

alter table google_calendar_connection enable row level security;
