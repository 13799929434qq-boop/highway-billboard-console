CREATE TABLE biz_asset_certificate (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 billboard_id BIGINT UNSIGNED NOT NULL,
 certificate_type VARCHAR(30) NOT NULL,
 certificate_number VARCHAR(100) NOT NULL,
 issued_date DATE NOT NULL,
 expiry_date DATE NOT NULL,
 file_key VARCHAR(500) NOT NULL,
 version INT NOT NULL,
 is_current TINYINT(1) NOT NULL DEFAULT 1,
 reason VARCHAR(500) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id),
 UNIQUE KEY uk_asset_certificate_version (billboard_id,certificate_type,version),
 CONSTRAINT fk_certificate_billboard FOREIGN KEY (billboard_id) REFERENCES biz_billboard(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
