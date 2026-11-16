-- 新版逐年租金和收款分配表。
-- 仅对新建、空的开发数据库执行；旧库不受影响。
CREATE TABLE biz_contract_annual_rent (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contract_id BIGINT UNSIGNED NOT NULL,
  billboard_id BIGINT UNSIGNED NOT NULL,
  rental_year INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  due_date DATE DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_contract_billboard_year (contract_id, billboard_id, rental_year),
  CONSTRAINT fk_annual_contract FOREIGN KEY (contract_id) REFERENCES biz_contract(id),
  CONSTRAINT fk_annual_billboard FOREIGN KEY (billboard_id) REFERENCES biz_billboard(id),
  CONSTRAINT chk_annual_rent_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合同广告牌逐年租金';

ALTER TABLE biz_receivable
  ADD COLUMN due_date DATE DEFAULT NULL,
  ADD UNIQUE KEY uk_receivable_contract_billboard_year (contract_id, billboard_id, year);

CREATE TABLE biz_receipt_allocation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id BIGINT UNSIGNED NOT NULL,
  receivable_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_allocation_receivable (receivable_id),
  KEY idx_allocation_transaction (transaction_id),
  CONSTRAINT fk_allocation_transaction FOREIGN KEY (transaction_id) REFERENCES biz_transaction(id),
  CONSTRAINT fk_allocation_receivable FOREIGN KEY (receivable_id) REFERENCES biz_receivable(id),
  CONSTRAINT chk_allocation_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收款流水与应收账单分配明细';
