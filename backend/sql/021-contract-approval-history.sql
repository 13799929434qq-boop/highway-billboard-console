-- 合同审批过程。已生效但没有过程的合同，按合同创建时间补记老板通过和财务通过。
CREATE TABLE IF NOT EXISTS biz_contract_approval (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  step        VARCHAR(20)  NOT NULL COMMENT '提交/老板审批/财务审批',
  result      VARCHAR(20)  NOT NULL COMMENT '提交/通过/退回',
  actor       VARCHAR(50)  NOT NULL,
  actor_name  VARCHAR(50)  NOT NULL,
  note        VARCHAR(500) NOT NULL DEFAULT '',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contract_approval (contract_id, created_at)
) ENGINE=InnoDB COMMENT='合同审批记录';

INSERT INTO biz_contract_approval(contract_id, step, result, actor, actor_name, note, created_at)
SELECT c.id, '老板审批', '通过', u.username, u.name, '', TIMESTAMP(c.start_date, '09:30:00')
FROM biz_contract c
JOIN sys_user u ON u.username = 'leader'
WHERE c.status = '生效'
  AND NOT EXISTS (
    SELECT 1 FROM biz_contract_approval a
    WHERE a.contract_id = c.id AND a.step = '老板审批' AND a.result = '通过'
  );

INSERT INTO biz_contract_approval(contract_id, step, result, actor, actor_name, note, created_at)
SELECT c.id, '财务审批', '通过', u.username, u.name, '', TIMESTAMP(c.start_date, '11:00:00')
FROM biz_contract c
JOIN sys_user u ON u.username = 'finance'
WHERE c.status = '生效'
  AND NOT EXISTS (
    SELECT 1 FROM biz_contract_approval a
    WHERE a.contract_id = c.id AND a.step = '财务审批' AND a.result = '通过'
  );
