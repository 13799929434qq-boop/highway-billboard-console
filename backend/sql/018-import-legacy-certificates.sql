-- The old system stored expiration dates on the billboard, without issue dates
-- or managed attachments. Preserve known facts and leave unknown dates empty.
USE billboard_react_dev_20261112;
ALTER TABLE biz_asset_certificate MODIFY issued_date DATE DEFAULT NULL;
START TRANSACTION;
INSERT INTO biz_asset_certificate(billboard_id,certificate_type,certificate_number,issued_date,expiry_date,file_key,version,is_current,reason)
 SELECT b.id,'路政批复',COALESCE(o.permit_no,''),NULL,o.permit_expire,'',1,1,'历史导入：签发日期和附件未提供'
 FROM billboard.biz_billboard o JOIN biz_billboard b ON b.id=o.id
 WHERE o.permit_expire IS NOT NULL;
INSERT INTO biz_asset_certificate(billboard_id,certificate_type,certificate_number,issued_date,expiry_date,file_key,version,is_current,reason)
 SELECT b.id,'保险',COALESCE(o.insurance_no,''),NULL,o.insurance_expire,'',1,1,'历史导入：签发日期和附件未提供'
 FROM billboard.biz_billboard o JOIN biz_billboard b ON b.id=o.id
 WHERE o.insurance_expire IS NOT NULL;
INSERT INTO biz_asset_certificate(billboard_id,certificate_type,certificate_number,issued_date,expiry_date,file_key,version,is_current,reason)
 SELECT b.id,'年审',COALESCE(o.annual_check_no,''),NULL,o.annual_check_expire,'',1,1,'历史导入：签发日期和附件未提供'
 FROM billboard.biz_billboard o JOIN biz_billboard b ON b.id=o.id
 WHERE o.annual_check_expire IS NOT NULL;
COMMIT;
