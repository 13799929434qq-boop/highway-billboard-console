CREATE TABLE sys_uploaded_file (
 id CHAR(36) NOT NULL,
 object_key VARCHAR(120) NOT NULL,
 original_name VARCHAR(255) NOT NULL,
 content_type VARCHAR(100) NOT NULL,
 byte_size BIGINT NOT NULL,
 uploaded_by VARCHAR(50) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id),
 UNIQUE KEY uk_uploaded_object_key (object_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE biz_billboard ADD COLUMN land_document_key CHAR(36) DEFAULT NULL;
ALTER TABLE biz_contract ADD COLUMN file_key CHAR(36) DEFAULT NULL;
