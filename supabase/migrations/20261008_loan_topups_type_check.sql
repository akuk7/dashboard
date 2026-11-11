-- The original transactions.type check constraint (set up before this repo tracked migrations)
-- didn't know about lend_out_topup/lend_in_topup, so inserting one failed with 23514. Default
-- Postgres naming for an unnamed inline check is <table>_<column>_check; drop that and recreate it
-- with the full current type list.
  alter table transactions drop constraint if exists transactions_type_check;
  alter table transactions add constraint transactions_type_check
    check (type in (
      'debit',
      'credit',
      'internal_transfer',
      'lend_out',
      'lend_in',
      'lend_out_topup',
      'lend_in_topup',
      'repayment_received',
      'repayment_made'
    ));
