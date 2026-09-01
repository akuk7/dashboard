-- Monthly budgets: one row per (month, year), a flat category_id -> amount map. No rollover -
-- each month is independent. RLS follows the existing pattern (no user_id column anywhere in
-- this app - gated purely by "is someone logged in", same as todo_categories in
-- 20260821_habits_lending_todo_categories.sql).

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2026),
  category_budgets jsonb not null default '{}', -- { "<category_id>": amount, ... }
  created_at timestamptz not null default now(),
  unique (month, year),
  check (year > 2026 or (year = 2026 and month >= 8)) -- no budgets before August 2026
);

alter table budgets enable row level security;

create policy "Authenticated users can read budgets"
  on budgets for select to authenticated using (true);
create policy "Authenticated users can insert budgets"
  on budgets for insert to authenticated with check (true);
create policy "Authenticated users can update budgets"
  on budgets for update to authenticated using (true);
create policy "Authenticated users can delete budgets"
  on budgets for delete to authenticated using (true);
