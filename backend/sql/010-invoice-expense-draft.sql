ALTER TABLE biz_transaction
 ADD COLUMN payee VARCHAR(150) NOT NULL DEFAULT '',
 ADD COLUMN billboard_id BIGINT UNSIGNED DEFAULT NULL,
 ADD COLUMN file_key CHAR(36) DEFAULT NULL,
 ADD CONSTRAINT fk_transaction_billboard FOREIGN KEY (billboard_id) REFERENCES biz_billboard(id);
CREATE TABLE biz_invoice (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 invoice_number VARCHAR(100) NOT NULL,
 merchant_id BIGINT UNSIGNED NOT NULL,
 contract_id BIGINT UNSIGNED NOT NULL,
 invoice_title VARCHAR(150) NOT NULL,
 tax_id VARCHAR(80) NOT NULL,
 amount DECIMAL(14,2) NOT NULL,
 invoice_date DATE NOT NULL,
 file_key CHAR(36) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id),
 UNIQUE KEY uk_invoice_number (invoice_number),
 CONSTRAINT fk_invoice_merchant FOREIGN KEY (merchant_id) REFERENCES biz_merchant(id),
 CONSTRAINT fk_invoice_contract FOREIGN KEY (contract_id) REFERENCES biz_contract(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE biz_change_draft (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 kind VARCHAR(30) NOT NULL,
 billboard_id BIGINT UNSIGNED DEFAULT NULL,
 contract_id BIGINT UNSIGNED DEFAULT NULL,
 change_type VARCHAR(30) NOT NULL,
 proposed_date DATE NOT NULL,
 reason VARCHAR(500) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT '草稿',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id),
 CONSTRAINT fk_change_billboard FOREIGN KEY (billboard_id) REFERENCES biz_billboard(id),
 CONSTRAINT fk_change_contract FOREIGN KEY (contract_id) REFERENCES biz_contract(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
