package com.gonglu.billboard.controller;

import com.gonglu.billboard.security.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.AccessDeniedException;

@RestController
@RequestMapping("/api/management")
public class ManagementSnapshotController {
    private final JdbcTemplate jdbc;
    public ManagementSnapshotController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/snapshot")
    public Map<String, Object> snapshot(@RequestParam String role, Authentication authentication, jakarta.servlet.http.HttpServletRequest request) {
        if (!(authentication.getPrincipal() instanceof CurrentUser user))
            throw new AccessDeniedException("当前角色的数据接入尚未完成");
        String storedRole = role.equals("operations") ? "archivist" : role;
        if (!storedRole.equalsIgnoreCase(user.role()) || !List.of("leader", "admin", "operations", "finance").contains(role))
            throw new AccessDeniedException("当前角色的数据接入尚未完成");
        Integer active = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_user WHERE username=? AND status='启用' AND role=? AND security_version=?",
                Integer.class, user.username(), storedRole, request.getSession().getAttribute("securityVersion"));
        if (active == null || active != 1) throw new AccessDeniedException("账号状态已变更");
        Map<String, Object> result = new LinkedHashMap<>();
        for (String key : List.of("assets","organizations","certificates","customers","contracts","rents","bills","receipts","allocations","expenses","invoices","accounts","dictionaries","logs","drafts","permissions","approvals"))
            result.put(key, List.of());
        if (role.equals("admin")) {
            result.put("accounts", rows("""
                SELECT CAST(id AS CHAR) id,username,name,
                CASE WHEN role='archivist' THEN 'operations' ELSE role END role,
                status,unit,'全部授权范围' scope FROM sys_user ORDER BY id
                """));
            result.put("logs", rows("""
                SELECT CAST(id AS CHAR) id,CAST(time AS CHAR) date,username actor,
                action operation,detail target,'' reason,'成功' result
                FROM sys_operation_log ORDER BY id DESC
                """));
            result.put("dictionaries", rows("""
                SELECT CAST(id AS CHAR) id,dict_type category,label name,
                item_code code,CAST(sort AS CHAR) `order`,status
                FROM sys_dict_item ORDER BY dict_type,sort,id
                """));
            result.put("permissions", rows("""
                SELECT role_code id,role_code role,scope,roads FROM sys_role_permission ORDER BY role_code
                """));
            return result;
        }
        result.put("assets", rows("""
            SELECT b.code id, COALESCE(NULLIF(b.display_name,''),b.code) name, COALESCE(s.name,'') road, COALESCE(s.region,'') region,
            COALESCE(s.operator,'') unit, COALESCE(b.ownership,'') ownership, COALESCE(b.land_nature,'') land, COALESCE(b.asset_nature,'') nature,
            COALESCE(b.stake_contract,'') contractStake, COALESCE(b.stake_actual,'') actualStake,
            COALESCE(b.stake_approval,'') approvedStake, COALESCE(b.spec,'') specification,
            CASE WHEN b.status IN ('停用','维护中') THEN b.status ELSE '在用' END status, COALESCE(b.photos,'') photos,
            COALESCE(b.land_document_key,'') landDocument, COALESCE(b.address,'') address
            FROM biz_billboard b LEFT JOIN biz_section s ON s.id=b.section_id WHERE b.deleted=0 ORDER BY b.id
            """));
        result.put("certificates", rows("""
            SELECT CAST(c.id AS CHAR) id,b.code assetId,c.certificate_type type,c.certificate_number number,
            CAST(c.issued_date AS CHAR) issued,CAST(c.expiry_date AS CHAR) expires,
            CAST(c.version AS CHAR) version,CASE WHEN c.is_current=1 THEN '是' ELSE '否' END `current`,
            c.file_key file,c.reason reason FROM biz_asset_certificate c
            JOIN biz_billboard b ON b.id=c.billboard_id ORDER BY c.id
            """));
        if (role.equals("operations")) {
            result.put("dictionaries", rows("""
                SELECT CAST(id AS CHAR) id,dict_type category,label name,item_code code,
                CAST(sort AS CHAR) `order`,status FROM sys_dict_item
                WHERE dict_type IN ('产权','性质','用地性质','规格') ORDER BY dict_type,sort,id
                """));
            result.put("organizations", rows("""
                SELECT CAST(id AS CHAR) id,name,kind type,
                COALESCE(CAST(parent_id AS CHAR),'') parent,status FROM biz_organization ORDER BY id
                """));
            result.put("contracts", rows("""
                SELECT code id,code name,CAST(start_date AS CHAR) start,
                CAST(end_date AS CHAR) end,status FROM biz_contract ORDER BY id
                """));
            result.put("rents", rows("""
                SELECT CAST(r.id AS CHAR) id,c.code contractId,b.code assetId,
                CAST(r.rental_year AS CHAR) year,CAST(ROUND(r.amount*100) AS CHAR) amount,
                COALESCE(CAST(r.due_date AS CHAR),'') due
                FROM biz_contract_annual_rent r JOIN biz_contract c ON c.id=r.contract_id
                JOIN biz_billboard b ON b.id=r.billboard_id ORDER BY r.id
                """));
            result.put("drafts", rows("""
                SELECT CAST(d.id AS CHAR) id,d.kind,b.code assetId,d.change_type changeType,
                CAST(d.proposed_date AS CHAR) date,d.reason,d.status FROM biz_change_draft d
                JOIN biz_billboard b ON b.id=d.billboard_id WHERE d.kind='资产变动' ORDER BY d.id DESC
                """));
            result.put("logs", rows("""
                SELECT CAST(id AS CHAR) id,CAST(time AS CHAR) date,username actor,
                action operation,detail target,'' reason,'成功' result
                FROM sys_operation_log WHERE username=? ORDER BY id DESC
                """, user.username()));
            return result;
        }
        if (role.equals("finance")) {
            result.put("customers", rows("""
                SELECT CAST(id AS CHAR) id,name,COALESCE(contact,'') contact,COALESCE(phone,'') phone,
                COALESCE(address,'') address,business_code code,invoice_title title,COALESCE(tax_no,'') taxId,
                COALESCE(bank_name,'') bank,COALESCE(bank_account,'') bankAccount,
                CASE WHEN blacklisted=1 THEN '是' ELSE '否' END blacklisted,blacklist_reason reason
                FROM biz_merchant ORDER BY id
                """));
        } else {
            result.put("customers", rows("SELECT CAST(id AS CHAR) id, name FROM biz_merchant ORDER BY id"));
        }
        result.put("contracts", rows("""
            SELECT c.code id, CAST(c.merchant_id AS CHAR) customerId, COALESCE(NULLIF(c.display_name,''),c.code) name,
            CAST(c.start_date AS CHAR) start, CAST(c.end_date AS CHAR) end, c.status status, COALESCE(c.file_key,'') file,
            COALESCE(c.approval_note,'') note
            FROM biz_contract c ORDER BY c.id
            """));
        result.put("approvals", rows("""
            SELECT CAST(a.id AS CHAR) id,c.code contractId,a.step step,a.result result,
            a.actor actor,a.actor_name name,COALESCE(a.note,'') note,
            DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i') date
            FROM biz_contract_approval a JOIN biz_contract c ON c.id=a.contract_id
            ORDER BY a.created_at,a.id
            """));
        result.put("rents", rows("""
            SELECT CAST(r.id AS CHAR) id,c.code contractId,b.code assetId,CAST(r.rental_year AS CHAR) year,
            CAST(ROUND(r.amount*100) AS CHAR) amount,COALESCE(CAST(r.due_date AS CHAR),'') due
            FROM biz_contract_annual_rent r JOIN biz_contract c ON c.id=r.contract_id
            JOIN biz_billboard b ON b.id=r.billboard_id ORDER BY r.id
            """));
        result.put("bills", rows("""
            SELECT CAST(r.id AS CHAR) id,c.code contractId,CAST(r.merchant_id AS CHAR) customerId,
            b.code assetId,CAST(r.year AS CHAR) year,CAST(ROUND(r.amount*100) AS CHAR) amount,
            CAST(ROUND(r.received*100) AS CHAR) received,
            COALESCE(CAST(r.due_date AS CHAR),'') due FROM biz_receivable r
            JOIN biz_contract c ON c.id=r.contract_id JOIN biz_billboard b ON b.id=r.billboard_id
            ORDER BY r.id
            """));
        result.put("receipts", rows("""
            SELECT CAST(id AS CHAR) id,COALESCE(CAST(merchant_id AS CHAR),'') customerId,
            CAST(ROUND(amount*100) AS CHAR) amount,CAST(tx_date AS CHAR) date,category type,
            payment_method method,account_number account,COALESCE(payment_reference,'') reference,COALESCE(summary,'') note,
            CASE WHEN legacy_unreconciled=1 THEN '是' ELSE '否' END legacyUnreconciled
            FROM biz_transaction WHERE direction='收入' ORDER BY id
            """));
        result.put("allocations", rows("""
            SELECT CAST(id AS CHAR) id,CAST(transaction_id AS CHAR) receiptId,CAST(receivable_id AS CHAR) billId,
            CAST(ROUND(amount*100) AS CHAR) amount FROM biz_receipt_allocation ORDER BY id
            """));
        if (role.equals("finance")) {
            result.put("expenses", rows("""
                SELECT CAST(t.id AS CHAR) id,t.category type,COALESCE(b.code,'') assetId,
                t.payee payee,CAST(ROUND(t.amount*100) AS CHAR) amount,CAST(t.tx_date AS CHAR) date,
                t.account_number account,COALESCE(t.file_key,'') file
                FROM biz_transaction t LEFT JOIN biz_billboard b ON b.id=t.billboard_id
                WHERE t.direction='支出' ORDER BY t.id
                """));
            result.put("invoices", rows("""
                SELECT CAST(i.id AS CHAR) id,i.invoice_number number,CAST(i.merchant_id AS CHAR) customerId,
                c.code contractId,i.invoice_title title,i.tax_id taxId,CAST(ROUND(i.amount*100) AS CHAR) amount,
                CAST(i.invoice_date AS CHAR) date,i.file_key file,'已登记' status
                FROM biz_invoice i JOIN biz_contract c ON c.id=i.contract_id ORDER BY i.id
                """));
            result.put("drafts", rows("""
                SELECT CAST(d.id AS CHAR) id,d.kind,c.code contractId,d.change_type changeType,
                CAST(d.proposed_date AS CHAR) date,d.reason,d.status FROM biz_change_draft d
                JOIN biz_contract c ON c.id=d.contract_id WHERE d.kind='合同变更' ORDER BY d.id DESC
                """));
        }
        return result;
    }
    private List<Map<String, String>> rows(String sql, Object... args) {
        return jdbc.query(sql, (rs, rowNum) -> {
            Map<String, String> row = new LinkedHashMap<>();
            var metadata = rs.getMetaData();
            for (int i = 1; i <= metadata.getColumnCount(); i++) {
                String value = rs.getString(i);
                row.put(metadata.getColumnLabel(i), value == null ? "" : value);
            }
            return row;
        }, args);
    }
}
