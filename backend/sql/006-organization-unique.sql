ALTER TABLE biz_organization
 ADD COLUMN parent_key BIGINT UNSIGNED GENERATED ALWAYS AS (IFNULL(parent_id, 0)) STORED,
 ADD UNIQUE KEY uk_organization_parent_kind_name (parent_key,kind,name);
