-- Preserve draft contract items without inventing payment due dates.
-- A historical item contains one fixed annual price; expand that price over
-- the contract's calendar years only for draft contracts.
INSERT INTO biz_contract_annual_rent(contract_id,billboard_id,rental_year,amount,due_date)
SELECT c.id,i.billboard_id,YEAR(c.start_date)+n.n,i.yearly_price,NULL
FROM biz_contract c
JOIN biz_contract_item i ON i.contract_id=c.id
JOIN (
 SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
 UNION ALL SELECT 20
) n ON YEAR(c.start_date)+n.n<=YEAR(c.end_date)
WHERE c.status='草稿'
AND NOT EXISTS (
 SELECT 1 FROM biz_contract_annual_rent r
 WHERE r.contract_id=c.id AND r.billboard_id=i.billboard_id AND r.rental_year=YEAR(c.start_date)+n.n
);
