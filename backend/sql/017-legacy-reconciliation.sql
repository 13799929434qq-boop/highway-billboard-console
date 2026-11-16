-- Historical receipts have no reliable link to specific receivables.
-- Keep them visible, but prevent allocating them again before reconciliation.
ALTER TABLE biz_transaction
  ADD COLUMN legacy_unreconciled TINYINT(1) NOT NULL DEFAULT 0;
