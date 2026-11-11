-- Transaction groups (a trip, an event): a named bucket you can optionally attach debits, credits
-- and split credits to. Deleting a group keeps its transactions and just detaches them.
-- RLS follows the existing pattern (no user_id; gated by "is someone logged in").

create table if not exists transaction_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

alter table transaction_groups enable row level security;

create policy "Authenticated users can read transaction_groups"
  on transaction_groups for select to authenticated using (true);
create policy "Authenticated users can insert transaction_groups"
  on transaction_groups for insert to authenticated with check (true);
create policy "Authenticated users can update transaction_groups"
  on transaction_groups for update to authenticated using (true);
create policy "Authenticated users can delete transaction_groups"
  on transaction_groups for delete to authenticated using (true);

alter table transactions
  add column if not exists group_id uuid references transaction_groups(id) on delete set null;

create index if not exists transactions_group_id_idx on transactions (group_id);

-- Per-group totals, computed in the database so the list stays cheap however much history exists.
-- security_invoker makes the view respect the caller's RLS instead of the view owner's.
create or replace view transaction_group_stats with (security_invoker = true) as
select
  g.id as group_id,
  count(t.id)::int as txn_count,
  coalesce(sum(t.amount) filter (where t.type = 'debit'), 0) as spent,
  coalesce(sum(t.amount) filter (where t.type in ('credit', 'split_credit')), 0) as received
from transaction_groups g
left join transactions t on t.group_id = g.id
group by g.id;
