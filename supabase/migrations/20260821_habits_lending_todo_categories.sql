-- Run this in the Supabase SQL editor for the dashboard project.
-- Covers: habit deactivation, the lend "is_temporary" rename, and todo categories.
--
-- Note on RLS: this repo has no existing SQL/migrations checked in, and the app code never
-- filters by user_id (it's a single-user app gated only by "is someone logged in?"). The policies
-- below for the new todo_categories table follow that same pattern (requires an authenticated
-- session, no per-row ownership check). If your existing tables (habits, transactions, todos, ...)
-- actually use a different RLS pattern, adjust the todo_categories policies below to match it.

-- =========================================================
-- 1. Habits: add a soft-deactivate flag
-- =========================================================
-- Deactivating a habit just hides it from the frontend; its history in habit_records is kept.
alter table habits
  add column if not exists active boolean not null default true;

-- =========================================================
-- 2. Transactions: rename affects_balance -> is_temporary
-- =========================================================
-- Same underlying boolean, renamed/relabeled to match how you actually think about it:
--   is_temporary = true  -> small/personal lend, included in account balance
--   is_temporary = false/null -> big loan or arrears, excluded from balance,
--                                 counted only in the "Lent" box and Net Worth
-- Non-lend transactions (debit/credit/transfer/repayment) keep is_temporary = true, unused otherwise.
alter table transactions rename column affects_balance to is_temporary;
alter table transactions alter column is_temporary drop not null;
alter table transactions alter column is_temporary drop default;

-- Reset every existing lend_out/lend_in row to "unclassified" (treated as a big loan/arrears until
-- you mark it manually) - go through the transaction list and re-open each lend in the edit popup
-- to flag the small/personal ones as temporary.
update transactions
set is_temporary = null
where type in ('lend_out', 'lend_in');

-- =========================================================
-- 3. Todo categories
-- =========================================================
create table if not exists todo_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#60a5fa',
  created_at timestamptz not null default now()
);

alter table todo_categories enable row level security;

create policy "Authenticated users can read todo_categories"
  on todo_categories for select
  to authenticated
  using (true);

create policy "Authenticated users can insert todo_categories"
  on todo_categories for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update todo_categories"
  on todo_categories for update
  to authenticated
  using (true);

create policy "Authenticated users can delete todo_categories"
  on todo_categories for delete
  to authenticated
  using (true);

alter table todos
  add column if not exists category_id uuid references todo_categories(id) on delete set null;
