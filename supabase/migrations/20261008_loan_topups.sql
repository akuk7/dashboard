-- A loan (one lend_out/lend_in transaction) can now grow via top-ups instead of only shrinking via
-- repayments - e.g. lending 10k then another 2k to the same person later. repays_transaction_id
-- already just points at the original loan transaction, so generalize its name since it's now
-- shared by repayment_received/repayment_made (subtracts from outstanding) and the new
-- lend_out_topup/lend_in_topup transaction types (adds to outstanding) - one person/loan stays one
-- combined entry no matter how many top-ups or repayments it's seen.
alter table transactions rename column repays_transaction_id to related_loan_id;
