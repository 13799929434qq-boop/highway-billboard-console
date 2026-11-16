-- 合同审批：老板审批通过后才进入财务审批。各年度租金仍保存在 biz_contract_annual_rent。
ALTER TABLE biz_contract
  MODIFY status VARCHAR(20) NOT NULL DEFAULT '草稿' COMMENT '草稿/待老板审批/待财务审批/生效/到期/解除';

ALTER TABLE biz_contract
  ADD COLUMN approval_note VARCHAR(500) NULL COMMENT '最近一次退回原因' AFTER status;
