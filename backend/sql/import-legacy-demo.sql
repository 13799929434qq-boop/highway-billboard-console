-- Import the existing billboard demo into an EMPTY billboard_react_dev_20261112.
-- No changes are made to the source database. Unknown dates/files and receipt
-- allocations are intentionally not invented.
SET NAMES utf8mb4;
USE billboard_react_dev_20261112;
START TRANSACTION;
INSERT INTO biz_section(id,code,name,region,operator,mileage,created_at)
 SELECT id,code,name,region,operator,mileage,created_at FROM billboard.biz_section;
INSERT INTO biz_organization(name,kind,parent_id,status)
 SELECT DISTINCT name,'路段',NULL,'启用' FROM biz_section WHERE TRIM(name)<>'';
INSERT INTO biz_organization(name,kind,parent_id,status)
 SELECT DISTINCT s.region,'地区',p.id,'启用' FROM biz_section s
 JOIN biz_organization p ON p.kind='路段' AND p.parent_id IS NULL AND p.name=s.name COLLATE utf8mb4_0900_ai_ci
 WHERE TRIM(s.region)<>'';
INSERT INTO biz_organization(name,kind,parent_id,status)
 SELECT DISTINCT s.operator,'运营单位',r.id,'启用' FROM biz_section s
 JOIN biz_organization p ON p.kind='路段' AND p.parent_id IS NULL AND p.name=s.name COLLATE utf8mb4_0900_ai_ci
 JOIN biz_organization r ON r.kind='地区' AND r.parent_id=p.id AND r.name=s.region COLLATE utf8mb4_0900_ai_ci
 WHERE TRIM(s.operator)<>'';
INSERT INTO biz_billboard(id,code,section_id,side,stake_contract,stake_actual,stake_approval,spec,width,height,ownership,land_nature,builder,build_year,status,permit_no,permit_expire,insurance_no,insurance_expire,annual_check_date,remark,created_at,organization_unit_id)
 SELECT b.id,b.code,b.section_id,b.side,b.stake_contract,b.stake_actual,b.stake_approval,b.spec,b.width,b.height,b.ownership,b.land_nature,b.builder,b.build_year,b.status,b.permit_no,b.permit_expire,b.insurance_no,b.insurance_expire,b.annual_check_date,b.remark,b.created_at,u.id
 FROM billboard.biz_billboard b JOIN biz_section s ON s.id=b.section_id
 LEFT JOIN biz_organization p ON p.kind='路段' AND p.parent_id IS NULL AND p.name=s.name COLLATE utf8mb4_0900_ai_ci
 LEFT JOIN biz_organization r ON r.kind='地区' AND r.parent_id=p.id AND r.name=s.region COLLATE utf8mb4_0900_ai_ci
 LEFT JOIN biz_organization u ON u.kind='运营单位' AND u.parent_id=r.id AND u.name=s.operator COLLATE utf8mb4_0900_ai_ci;
INSERT INTO biz_merchant(id,name,contact,phone,address,tax_no,bank_name,bank_account,blacklisted,remark,created_at)
 SELECT id,name,contact,phone,address,tax_no,bank_name,bank_account,blacklisted,remark,created_at FROM billboard.biz_merchant;
INSERT INTO biz_contract(id,code,merchant_id,sign_date,start_date,end_date,years,total_amount,status,remark,created_at)
 SELECT id,code,merchant_id,sign_date,start_date,end_date,years,total_amount,status,remark,created_at FROM billboard.biz_contract;
INSERT INTO biz_contract_item(id,contract_id,billboard_id,yearly_price)
 SELECT id,contract_id,billboard_id,yearly_price FROM billboard.biz_contract_item;
INSERT INTO biz_receivable(id,contract_id,merchant_id,billboard_id,year,amount,received,status)
 SELECT id,contract_id,merchant_id,billboard_id,year,amount,received,status FROM billboard.biz_receivable;
INSERT INTO biz_contract_annual_rent(contract_id,billboard_id,rental_year,amount)
 SELECT contract_id,billboard_id,year,amount FROM billboard.biz_receivable;
INSERT INTO biz_transaction(id,tx_date,direction,category,amount,merchant_id,contract_id,summary,operator,created_at,legacy_unreconciled)
 SELECT id,tx_date,direction,CASE WHEN direction='收入' THEN CONCAT('历史/',category) ELSE category END,
 amount,merchant_id,contract_id,summary,operator,created_at,CASE WHEN direction='收入' THEN 1 ELSE 0 END
 FROM billboard.biz_transaction;
COMMIT;
