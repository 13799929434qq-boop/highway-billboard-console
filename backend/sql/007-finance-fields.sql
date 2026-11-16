ALTER TABLE biz_merchant
 ADD COLUMN business_code VARCHAR(80) NOT NULL DEFAULT '',
 ADD COLUMN invoice_title VARCHAR(150) NOT NULL DEFAULT '',
 ADD COLUMN blacklist_reason VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE biz_contract
 ADD COLUMN display_name VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE biz_transaction
 ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT '',
 ADD COLUMN account_number VARCHAR(100) NOT NULL DEFAULT '',
 ADD COLUMN payment_reference VARCHAR(120) DEFAULT NULL,
 ADD UNIQUE KEY uk_receipt_reference (account_number,payment_reference);
