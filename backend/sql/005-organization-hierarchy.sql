CREATE TABLE biz_organization (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  parent_id BIGINT UNSIGNED DEFAULT NULL,
  status VARCHAR(10) NOT NULL DEFAULT '启用',
  PRIMARY KEY (id),
  UNIQUE KEY uk_org_parent_kind_name (parent_id,kind,name),
  CONSTRAINT fk_org_parent FOREIGN KEY (parent_id) REFERENCES biz_organization(id),
  CONSTRAINT chk_org_kind CHECK (kind IN ('路段','地区','运营单位'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE biz_billboard
 ADD COLUMN display_name VARCHAR(150) NOT NULL DEFAULT '',
 ADD COLUMN address VARCHAR(250) NOT NULL DEFAULT '',
 ADD COLUMN organization_unit_id BIGINT UNSIGNED DEFAULT NULL,
 ADD CONSTRAINT fk_billboard_unit FOREIGN KEY (organization_unit_id) REFERENCES biz_organization(id);
