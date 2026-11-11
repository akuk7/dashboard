-- transactions_transfer_shape_check hardcodes the list of non-transfer types allowed to have
-- to_account_id null. lend_out_topup/lend_in_topup aren't in that list, so every top-up row fails
-- regardless of its other fields (23514). Add them to the same branch as lend_out/lend_in.
alter table transactions drop constraint if exists transactions_transfer_shape_check;
alter table transactions add constraint transactions_transfer_shape_check
  check (
    (type = 'internal_transfer' and to_account_id is not null and to_account_id <> account_id)
    or (
      type = any (array[
        'debit', 'credit', 'lend_out', 'lend_in', 'lend_out_topup', 'lend_in_topup',
        'repayment_received', 'repayment_made'
      ])
      and to_account_id is null
    )
  );
