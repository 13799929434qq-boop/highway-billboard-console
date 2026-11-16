INSERT INTO sys_dict(type,name) VALUES ('产权','产权'),('用地性质','用地性质'),('规格','规格')
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO sys_dict_item(dict_type,label,item_code,sort,status) VALUES
('产权','自有','OWNED',10,'启用'),('产权','租赁','LEASED',20,'启用'),
('用地性质','公路用地','ROAD',10,'启用'),('用地性质','自有土地','OWNED_LAND',20,'启用'),
('用地性质','集体土地','COLLECTIVE',30,'启用'),('规格','18m × 6m','SPEC_18_6',10,'启用')
ON DUPLICATE KEY UPDATE item_code=VALUES(item_code);
