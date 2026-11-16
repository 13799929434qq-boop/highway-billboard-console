ALTER TABLE sys_dict_item
  ADD COLUMN item_code VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT '启用',
  ADD UNIQUE KEY uk_dict_type_code (dict_type, item_code);
