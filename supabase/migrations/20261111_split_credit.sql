-- split_credit: money friends pay back for a group expense you paid (a debit). It is money in for
-- the account balance, but not income - it reduces expense/category spend instead - and it must
-- point at the debit it settles part of.
--
-- Linking is generalized: related_loan_id becomes related_transaction_id, shared by loan
-- repayments/top-ups (point at the lend_out/lend_in) and split_credits (point at the debit).
-- A parent is any transaction something links to; transactions.linked_count is maintained by a
-- trigger so the UI can tell in O(1), without scanning every transaction.

alter table transactions rename column related_loan_id to related_transaction_id;

-- The FK would fail on orphaned links, so null those out first (a link to a deleted row is meaningless).
update transactions t
  set related_transaction_id = null
  where related_transaction_id is not null
    and not exists (select 1 from transactions p where p.id = t.related_transaction_id);

alter table transactions
  add constraint transactions_related_transaction_fk
  foreign key (related_transaction_id) references transactions(id) on delete restrict;

create index if not exists transactions_related_transaction_id_idx
  on transactions (related_transaction_id);

-- Parent marker: number of transactions linked to this one. > 0 means "parent".
alter table transactions add column if not exists linked_count int not null default 0;

update transactions p
  set linked_count = (select count(*) from transactions c where c.related_transaction_id = p.id);

create or replace function transactions_maintain_linked_count() returns trigger
language plpgsql as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.related_transaction_id is not null
     and (tg_op = 'DELETE' or new.related_transaction_id is distinct from old.related_transaction_id) then
    update transactions set linked_count = linked_count - 1 where id = old.related_transaction_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.related_transaction_id is not null
     and (tg_op = 'INSERT' or new.related_transaction_id is distinct from old.related_transaction_id) then
    update transactions set linked_count = linked_count + 1 where id = new.related_transaction_id;
  end if;
  return null;
end;
$$;

drop trigger if exists transactions_linked_count_trg on transactions;
create trigger transactions_linked_count_trg
  after insert or update of related_transaction_id or delete on transactions
  for each row execute function transactions_maintain_linked_count();

-- Allow the new type (same drop/recreate pattern as the 20261008 migrations).
alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in (
    'debit',
    'credit',
    'split_credit',
    'internal_transfer',
    'lend_out',
    'lend_in',
    'lend_out_topup',
    'lend_in_topup',
    'repayment_received',
    'repayment_made'
  ));

alter table transactions drop constraint if exists transactions_transfer_shape_check;
alter table transactions add constraint transactions_transfer_shape_check
  check (
    (type = 'internal_transfer' and to_account_id is not null and to_account_id <> account_id)
    or (
      type = any (array[
        'debit', 'credit', 'split_credit', 'lend_out', 'lend_in', 'lend_out_topup', 'lend_in_topup',
        'repayment_received', 'repayment_made'
      ])
      and to_account_id is null
    )
  );

alter table transactions drop constraint if exists transactions_split_credit_link_check;
alter table transactions add constraint transactions_split_credit_link_check
  check (type <> 'split_credit' or related_transaction_id is not null);
