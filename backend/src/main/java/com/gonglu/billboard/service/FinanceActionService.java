package com.gonglu.billboard.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class FinanceActionService {
    private final JdbcTemplate jdbc;
    public FinanceActionService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public ResponseEntity<?> execute(String type, Map<String, String> v, String username, String name) {
        try {
            return switch (type) {
                case "saveCustomer" -> customer(v, username, name);
                case "blacklist" -> blacklist(v, username, name);
                case "saveContract" -> contract(v, username, name);
                case "saveRent" -> rent(v, username, name);
                case "saveRentSchedule" -> rentSchedule(v, username, name);
                case "submitContract" -> submit(v, username, name);
                case "bossApprove" -> bossApprove(v, username, name);
                case "bossReject" -> bossReject(v, username, name);
                case "activate" -> activate(v, username, name);
                case "saveReceipt" -> receipt(v, username, name);
                case "allocate" -> allocate(v, username, name);
                case "saveExpense" -> expense(v, username, name);
                case "saveInvoice" -> invoice(v, username, name);
                case "saveContractDraft" -> draft(v, username, name);
                default -> ResponseEntity.status(501).body(Map.of("message", "该业务操作正在接入"));
            };
        } catch (IllegalArgumentException e) {
            org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (DuplicateKeyException e) {
            org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return ResponseEntity.badRequest().body(Map.of("message", "编号或流水号已存在"));
        }
    }
    private ResponseEntity<?> customer(Map<String,String> v, String actor, String actorName) {
        String name = required(v,"name"), contact = required(v,"contact"), phone = required(v,"phone");
        Object[] fields = {name, contact, phone, text(v,"code"), text(v,"address"), text(v,"title"),
                text(v,"taxId"), text(v,"bank"), text(v,"bankAccount")};
        String id=text(v,"id");
        if (id.isBlank()) jdbc.update("""
            INSERT INTO biz_merchant(name,contact,phone,business_code,address,invoice_title,tax_no,bank_name,bank_account)
            VALUES(?,?,?,?,?,?,?,?,?)
            """, fields);
        else {
            int updated=jdbc.update("""
                UPDATE biz_merchant SET name=?,contact=?,phone=?,business_code=?,address=?,invoice_title=?,
                tax_no=?,bank_name=?,bank_account=? WHERE id=?
                """, name,contact,phone,text(v,"code"),text(v,"address"),text(v,"title"),text(v,"taxId"),text(v,"bank"),text(v,"bankAccount"),id);
            if (updated==0 && count("SELECT COUNT(*) FROM biz_merchant WHERE id=?",id)==0) throw new IllegalArgumentException("客户不存在");
        }
        audit(actor,actorName,"保存客户",name);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> blacklist(Map<String,String> v,String actor,String actorName) {
        String id=required(v,"id"), reason=required(v,"reason");
        var rows=jdbc.queryForList("SELECT id,name,blacklisted FROM biz_merchant WHERE id=? FOR UPDATE",id);
        if(rows.isEmpty()) throw new IllegalArgumentException("客户不存在");
        var row=rows.get(0);
        Object value=row.get("blacklisted");
        boolean old=value instanceof Boolean flag ? flag : ((Number)value).intValue()!=0;
        jdbc.update("UPDATE biz_merchant SET blacklisted=?,blacklist_reason=? WHERE id=?",!old,reason,id);
        audit(actor,actorName,old?"解除黑名单":"列入黑名单",String.valueOf(row.get("name"))+" "+reason);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> contract(Map<String,String> v,String actor,String actorName) {
        String code=required(v,"id"), title=required(v,"name"), customerId=required(v,"customerId");
        String file=text(v,"file");
        if (!file.isEmpty() && count("""
            SELECT COUNT(*) FROM sys_uploaded_file f WHERE f.id=? AND
            (f.uploaded_by=? OR EXISTS(SELECT 1 FROM biz_contract c WHERE c.code=? AND c.file_key=f.id))
            """,file,actor,code)==0) throw new IllegalArgumentException("合同附件不存在或无权使用");
        LocalDate start=date(required(v,"start")),end=date(required(v,"end"));
        if(end.isBefore(start)) throw new IllegalArgumentException("合同日期范围不正确");
        if(count("SELECT COUNT(*) FROM biz_merchant WHERE id=?",customerId)!=1) throw new IllegalArgumentException("客户不存在");
        var found=jdbc.queryForList("SELECT id,status FROM biz_contract WHERE code=? FOR UPDATE",code);
        if(found.isEmpty()){
            if("是".equals(v.get("editing"))) throw new IllegalArgumentException("合同不存在");
            jdbc.update("INSERT INTO biz_contract(code,display_name,merchant_id,start_date,end_date,years,total_amount,status,file_key) VALUES(?,?,?,?,?,?,0,'草稿',NULLIF(?,''))",
                    code,title,customerId,start,end,end.getYear()-start.getYear()+1,file);
        }else{
            if(!"是".equals(v.get("editing"))) throw new IllegalArgumentException("合同编号已存在");
            if(!"草稿".equals(found.get(0).get("status"))) throw new IllegalArgumentException("只有草稿可以修改");
            long id=((Number)found.get(0).get("id")).longValue();
            Integer outside=jdbc.queryForObject("SELECT COUNT(*) FROM biz_contract_annual_rent WHERE contract_id=? AND (rental_year<? OR rental_year>?)",
                    Integer.class,id,start.getYear(),end.getYear());
            if(outside!=null&&outside>0) throw new IllegalArgumentException("已录入租金年度超出新的合同期限");
            jdbc.update("UPDATE biz_contract SET display_name=?,merchant_id=?,start_date=?,end_date=?,years=?,file_key=NULLIF(?,'') WHERE id=?",
                    title,customerId,start,end,end.getYear()-start.getYear()+1,file,id);
        }
        audit(actor,actorName,"保存合同草稿",code);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> rent(Map<String,String> v,String actor,String actorName) {
        String contractCode=required(v,"contractId"),assetCode=required(v,"assetId");
        LocalDate due=date(required(v,"due")); int year;
        try{year=Integer.parseInt(required(v,"year"));}catch(NumberFormatException e){throw new IllegalArgumentException("年度不正确");}
        BigDecimal amount=amount(required(v,"amount"),false);
        var contracts=jdbc.queryForList("SELECT id,status,start_date,end_date FROM biz_contract WHERE code=? FOR UPDATE",contractCode);
        if(contracts.isEmpty()||!"草稿".equals(contracts.get(0).get("status"))) throw new IllegalArgumentException("仅合同草稿可以修改年度租金");
        var c=contracts.get(0); LocalDate start=((java.sql.Date)c.get("start_date")).toLocalDate(),end=((java.sql.Date)c.get("end_date")).toLocalDate();
        if(year<start.getYear()||year>end.getYear()||due.getYear()!=year) throw new IllegalArgumentException("年度必须在合同期限内且与应收日期一致");
        var boards=jdbc.queryForList("SELECT id FROM biz_billboard WHERE code=? AND deleted=0 FOR UPDATE",assetCode);
        if(boards.isEmpty()) throw new IllegalArgumentException("广告牌不存在");
        long contractId=((Number)c.get("id")).longValue(),billboardId=((Number)boards.get(0).get("id")).longValue();
        jdbc.update("""
            INSERT INTO biz_contract_annual_rent(contract_id,billboard_id,rental_year,amount,due_date)
            VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount),due_date=VALUES(due_date)
            """,contractId,billboardId,year,amount,due);
        jdbc.update("UPDATE biz_contract SET total_amount=(SELECT COALESCE(SUM(amount),0) FROM biz_contract_annual_rent WHERE contract_id=?) WHERE id=?",contractId,contractId);
        assertBoardYearsDistinct(contractId,billboardId,start,end);
        audit(actor,actorName,"保存年度租金",contractCode+"/"+assetCode+"/"+year);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> rentSchedule(Map<String,String> v,String actor,String actorName) {
        String contractCode=required(v,"contractId"),assetCode=required(v,"assetId");
        var contracts=jdbc.queryForList("SELECT id,status,start_date,end_date FROM biz_contract WHERE code=? FOR UPDATE",contractCode);
        if(contracts.isEmpty()||!"草稿".equals(contracts.get(0).get("status"))) throw new IllegalArgumentException("仅合同草稿可以修改年度租金");
        var c=contracts.get(0); LocalDate start=((java.sql.Date)c.get("start_date")).toLocalDate(),end=((java.sql.Date)c.get("end_date")).toLocalDate();
        var boards=jdbc.queryForList("SELECT id FROM biz_billboard WHERE code=? AND deleted=0 FOR UPDATE",assetCode);
        if(boards.isEmpty()) throw new IllegalArgumentException("广告牌不存在");
        long contractId=((Number)c.get("id")).longValue(),billboardId=((Number)boards.get(0).get("id")).longValue();
        java.util.Set<String> distinct=new java.util.HashSet<>();
        for(int year=start.getYear();year<=end.getYear();year++){
            BigDecimal value=amount(required(v,"amount"+year),false);
            LocalDate due=date(required(v,"due"+year));
            if(due.getYear()!=year) throw new IllegalArgumentException("应收日期须落在对应年度");
            if(!distinct.add(value.stripTrailingZeros().toPlainString())) throw new IllegalArgumentException("同一广告牌各年度租金必须不同");
            jdbc.update("""
                INSERT INTO biz_contract_annual_rent(contract_id,billboard_id,rental_year,amount,due_date)
                VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount),due_date=VALUES(due_date)
                """,contractId,billboardId,year,value,due);
        }
        jdbc.update("UPDATE biz_contract SET total_amount=(SELECT COALESCE(SUM(amount),0) FROM biz_contract_annual_rent WHERE contract_id=?) WHERE id=?",contractId,contractId);
        audit(actor,actorName,"保存分年租金",contractCode+"/"+assetCode);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> submit(Map<String,String> v,String actor,String actorName) {
        var c=lockedContract(required(v,"id"));
        if(!"草稿".equals(c.get("status"))) throw new IllegalArgumentException("仅草稿可以提交老板审批");
        readyRates(c);
        jdbc.update("UPDATE biz_contract SET status='待老板审批',approval_note=NULL WHERE id=?",c.get("id"));
        approval(c.get("id"),"提交","提交",actor,actorName,"");
        audit(actor,actorName,"提交老板审批",String.valueOf(c.get("code")));
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> bossApprove(Map<String,String> v,String actor,String actorName) {
        var c=lockedContract(required(v,"id"));
        if(!"待老板审批".equals(c.get("status"))) throw new IllegalArgumentException("当前合同不在老板审批环节");
        jdbc.update("UPDATE biz_contract SET status='待财务审批',approval_note=NULL WHERE id=?",c.get("id"));
        approval(c.get("id"),"老板审批","通过",actor,actorName,"");
        audit(actor,actorName,"老板审批通过",String.valueOf(c.get("code")));
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> bossReject(Map<String,String> v,String actor,String actorName) {
        String reason=required(v,"reason");
        var c=lockedContract(required(v,"id"));
        if(!"待老板审批".equals(c.get("status"))) throw new IllegalArgumentException("当前合同不在老板审批环节");
        jdbc.update("UPDATE biz_contract SET status='草稿',approval_note=? WHERE id=?",reason,c.get("id"));
        approval(c.get("id"),"老板审批","退回",actor,actorName,reason);
        audit(actor,actorName,"老板退回合同",String.valueOf(c.get("code"))+" "+reason);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> activate(Map<String,String> v,String actor,String actorName) {
        var c=lockedContract(required(v,"id"));
        if(!"待财务审批".equals(c.get("status"))) throw new IllegalArgumentException("需老板审批通过后，财务才能审批生效");
        long id=((Number)c.get("id")).longValue(),merchant=((Number)c.get("merchant_id")).longValue();
        var rates=readyRates(c);
        for(var rate:rates) jdbc.update("""
            INSERT INTO biz_receivable(contract_id,merchant_id,billboard_id,year,amount,received,status,due_date)
            VALUES(?,?,?,?,?,0,'未收',?)
            """,id,merchant,rate.get("billboard_id"),rate.get("rental_year"),rate.get("amount"),rate.get("due_date"));
        jdbc.update("UPDATE biz_contract SET status='生效',approval_note=NULL WHERE id=?",id);
        approval(id,"财务审批","通过",actor,actorName,"");
        audit(actor,actorName,"财务审批通过",String.valueOf(c.get("code")));
        return ResponseEntity.noContent().build();
    }
    private Map<String,Object> lockedContract(String code) {
        var contracts=jdbc.queryForList("SELECT id,code,merchant_id,status,start_date,end_date FROM biz_contract WHERE code=? FOR UPDATE",code);
        if(contracts.isEmpty()) throw new IllegalArgumentException("合同不存在");
        return contracts.get(0);
    }
    private List<Map<String,Object>> readyRates(Map<String,Object> c) {
        long id=((Number)c.get("id")).longValue(),merchant=((Number)c.get("merchant_id")).longValue();
        LocalDate start=((java.sql.Date)c.get("start_date")).toLocalDate(),end=((java.sql.Date)c.get("end_date")).toLocalDate();
        var merchants=jdbc.queryForList("SELECT id,blacklisted FROM biz_merchant WHERE id=? FOR UPDATE",merchant);
        if(merchants.isEmpty()) throw new IllegalArgumentException("客户不存在或已列入黑名单");
        Object blacklisted=merchants.get(0).get("blacklisted");
        if(blacklisted instanceof Boolean flag ? flag : ((Number)blacklisted).intValue()!=0)
            throw new IllegalArgumentException("客户不存在或已列入黑名单");
        var rates=jdbc.queryForList("SELECT billboard_id,rental_year,amount,due_date FROM biz_contract_annual_rent WHERE contract_id=? ORDER BY billboard_id,rental_year",id);
        if(rates.isEmpty()) throw new IllegalArgumentException("请先录入年度租金");
        List<Long> boards=rates.stream().map(r->((Number)r.get("billboard_id")).longValue()).distinct().sorted().toList();
        for(long board:boards) {
            var records=jdbc.queryForList("SELECT id,status,land_nature,land_document_key FROM biz_billboard WHERE id=? AND deleted=0 FOR UPDATE",board);
            if(records.isEmpty() || Set.of("停用","维护中").contains(records.get(0).get("status")))
                throw new IllegalArgumentException("广告牌不存在或当前不可用");
            if("集体土地".equals(records.get(0).get("land_nature")) && records.get(0).get("land_document_key")==null)
                throw new IllegalArgumentException("集体土地需要上传流转手续");
            for(int y=start.getYear();y<=end.getYear();y++){final int year=y;
                if(rates.stream().noneMatch(r->((Number)r.get("billboard_id")).longValue()==board && ((Number)r.get("rental_year")).intValue()==year && r.get("due_date")!=null && ((BigDecimal)r.get("amount")).signum()>0))
                    throw new IllegalArgumentException("每块广告牌的每个年度都需要设置租金和到期日");
            }
            var certificates=jdbc.queryForList("""
                SELECT certificate_type FROM biz_asset_certificate
                WHERE billboard_id=? AND is_current=1 AND issued_date<=CURRENT_DATE AND expiry_date>=CURRENT_DATE
                AND certificate_type IN ('路政批复','保险','年审')
                FOR UPDATE
                """,board);
            if(certificates.stream().map(row->row.get("certificate_type")).distinct().count()!=3)
                throw new IllegalArgumentException("广告牌路政、保险或年审证件尚未齐备");
            var conflicts=jdbc.queryForList("""
                SELECT c.id FROM biz_contract_annual_rent r JOIN biz_contract c ON c.id=r.contract_id
                WHERE r.billboard_id=? AND c.id<>? AND c.status='生效' AND c.start_date<=? AND c.end_date>=?
                FOR UPDATE
                """,board,id,end,start);
            if(!conflicts.isEmpty()) throw new IllegalArgumentException("广告牌已有租期重叠的生效合同");
            assertBoardYearsDistinct(id,board,start,end);
        }
        return rates;
    }
    private void assertBoardYearsDistinct(long contractId,long billboardId,LocalDate start,LocalDate end) {
        int span=end.getYear()-start.getYear()+1;
        if(span<=1) return;
        var rows=jdbc.queryForList("SELECT amount FROM biz_contract_annual_rent WHERE contract_id=? AND billboard_id=? AND rental_year BETWEEN ? AND ?",contractId,billboardId,start.getYear(),end.getYear());
        if(rows.size()<span) return;
        if(rows.stream().map(row->((BigDecimal)row.get("amount")).stripTrailingZeros().toPlainString()).distinct().count()!=rows.size())
            throw new IllegalArgumentException("同一广告牌各年度租金必须不同");
    }
    private ResponseEntity<?> receipt(Map<String,String> v,String actor,String actorName) {
        String customer=required(v,"customerId"),type=required(v,"type"),account=required(v,"account"),reference=required(v,"reference");
        BigDecimal amount=amount(required(v,"amount"),false); LocalDate date=date(required(v,"date"));
        if(date.isAfter(LocalDate.now(java.time.ZoneId.of("Asia/Shanghai")))) throw new IllegalArgumentException("到账日期不能晚于今天");
        if(!Set.of("租金","押金","履约金","维修保证金").contains(type)) throw new IllegalArgumentException("款项类型不正确");
        if(count("SELECT COUNT(*) FROM biz_merchant WHERE id=?",customer)!=1) throw new IllegalArgumentException("客户不存在");
        jdbc.update("""
            INSERT INTO biz_transaction(tx_date,direction,category,amount,merchant_id,summary,operator,payment_method,account_number,payment_reference)
            VALUES(?,'收入',?,?,?,?,?,?,?,?)
            """,date,type,amount,customer,text(v,"note"),actor,text(v,"method"),account,reference);
        audit(actor,actorName,"登记收款",reference);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> allocate(Map<String,String> v,String actor,String actorName) {
        String receiptId=required(v,"receiptId");
        var receipts=jdbc.queryForList("SELECT id,merchant_id,amount,category,legacy_unreconciled FROM biz_transaction WHERE id=? AND direction='收入' FOR UPDATE",receiptId);
        if(receipts.isEmpty()||!"租金".equals(receipts.get(0).get("category"))) throw new IllegalArgumentException("只能分配已登记的租金");
        Object legacy = receipts.get(0).get("legacy_unreconciled");
        if (Boolean.TRUE.equals(legacy) || legacy instanceof Number n && n.intValue() != 0)
            throw new IllegalArgumentException("历史收款缺少核销明细，需先核对后才能分配");
        var receipt=receipts.get(0); long customer=((Number)receipt.get("merchant_id")).longValue();
        BigDecimal alreadyAllocated=jdbc.query(
                "SELECT amount FROM biz_receipt_allocation WHERE transaction_id=? FOR UPDATE",
                rs -> { BigDecimal total=BigDecimal.ZERO; while(rs.next()) total=total.add(rs.getBigDecimal(1)); return total; },
                receiptId);
        BigDecimal available=((BigDecimal)receipt.get("amount")).subtract(alreadyAllocated);
        var entries=v.entrySet().stream().filter(e->e.getKey().startsWith("bill:")&&!e.getValue().isBlank())
                .sorted(Comparator.comparing(Map.Entry::getKey)).toList();
        if(entries.isEmpty()) throw new IllegalArgumentException("请填写分配金额");
        BigDecimal total=BigDecimal.ZERO;
        for(var entry:entries){BigDecimal value=amount(entry.getValue(),true); if(value.signum()==0)continue;
            String billId=entry.getKey().substring(5); var bills=jdbc.queryForList("SELECT id,merchant_id,amount,received FROM biz_receivable WHERE id=? FOR UPDATE",billId);
            if(bills.isEmpty()||((Number)bills.get(0).get("merchant_id")).longValue()!=customer) throw new IllegalArgumentException("不能跨客户分配");
            BigDecimal received=(BigDecimal)bills.get(0).get("received");
            if(value.compareTo(((BigDecimal)bills.get(0).get("amount")).subtract(received))>0) throw new IllegalArgumentException("分配金额超过账单未收金额");
            total=total.add(value);
        }
        if(total.signum()==0 || total.compareTo(available)>0) throw new IllegalArgumentException("分配金额须大于零且不能超过收款余额");
        for(var entry:entries){BigDecimal value=amount(entry.getValue(),true);if(value.signum()==0)continue;
            String billId=entry.getKey().substring(5);
            jdbc.update("INSERT INTO biz_receipt_allocation(transaction_id,receivable_id,amount) VALUES(?,?,?)",receiptId,billId,value);
            jdbc.update("""
                UPDATE biz_receivable SET status=CASE WHEN received+?>=amount THEN '已收' ELSE '部分缴纳' END,
                received=received+? WHERE id=?
                """,value,value,billId);
        }
        audit(actor,actorName,"分配收款",receiptId);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> expense(Map<String,String> v,String actor,String actorName) {
        String type=required(v,"type"), payee=required(v,"payee"), file=required(v,"file"), account=required(v,"account");
        String assetCode=required(v,"assetId");
        LocalDate date=date(required(v,"date"));
        BigDecimal amount=amount(required(v,"amount"),false);
        if(!Set.of("路政费","保险费","维修费").contains(type)) throw new IllegalArgumentException("支出类型不正确");
        requireOwnedFile(file,actor);
        var assets=jdbc.queryForList("SELECT id FROM biz_billboard WHERE code=? AND deleted=0",assetCode);
        if(assets.isEmpty()) throw new IllegalArgumentException("广告牌不存在");
        jdbc.update("""
            INSERT INTO biz_transaction(tx_date,direction,category,amount,summary,operator,account_number,payee,billboard_id,file_key)
            VALUES(?,'支出',?,?,?,?,?,?,?,?)
            """,date,type,amount,"支出登记",actor,account,payee,assets.get(0).get("id"),file);
        audit(actor,actorName,"登记支出",assetCode+"/"+type);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> invoice(Map<String,String> v,String actor,String actorName) {
        String customer=required(v,"customerId"), contractCode=required(v,"contractId");
        String number=required(v,"number"), title=required(v,"title"), taxId=required(v,"taxId"), file=required(v,"file");
        BigDecimal amount=amount(required(v,"amount"),false); LocalDate date=date(required(v,"date"));
        requireOwnedFile(file,actor);
        var contracts=jdbc.queryForList("SELECT id FROM biz_contract WHERE code=? AND merchant_id=?",contractCode,customer);
        if(contracts.isEmpty()) throw new IllegalArgumentException("客户与合同不匹配");
        jdbc.update("""
            INSERT INTO biz_invoice(invoice_number,merchant_id,contract_id,invoice_title,tax_id,amount,invoice_date,file_key)
            VALUES(?,?,?,?,?,?,?,?)
            """,number,customer,contracts.get(0).get("id"),title,taxId,amount,date,file);
        audit(actor,actorName,"登记发票",number);
        return ResponseEntity.noContent().build();
    }
    private ResponseEntity<?> draft(Map<String,String> v,String actor,String actorName) {
        String code=required(v,"contractId"), change=required(v,"changeType"), reason=required(v,"reason");
        LocalDate date=date(required(v,"date"));
        if(!Set.of("变更","解除").contains(change)) throw new IllegalArgumentException("变动类型不正确");
        var contracts=jdbc.queryForList("SELECT id FROM biz_contract WHERE code=?",code);
        if(contracts.isEmpty()) throw new IllegalArgumentException("合同不存在");
        jdbc.update("INSERT INTO biz_change_draft(kind,contract_id,change_type,proposed_date,reason) VALUES('合同变更',?,?,?,?)",
                contracts.get(0).get("id"),change,date,reason);
        audit(actor,actorName,"保存合同变动草稿",code+"/"+change);
        return ResponseEntity.noContent().build();
    }
    private void requireOwnedFile(String id,String owner) {
        if(count("SELECT COUNT(*) FROM sys_uploaded_file WHERE id=? AND uploaded_by=?",id,owner)!=1)
            throw new IllegalArgumentException("附件不存在或无权使用");
    }
    private String required(Map<String,String> values,String key){String value=text(values,key);if(value.isBlank())throw new IllegalArgumentException("请填写所有必填项");return value;}
    private String text(Map<String,String> values,String key){return values.getOrDefault(key,"").trim();}
    private LocalDate date(String value){try{return LocalDate.parse(value);}catch(DateTimeParseException e){throw new IllegalArgumentException("日期格式不正确");}}
    private BigDecimal amount(String value,boolean zeroAllowed){
        try { if(!value.matches("\\d+(\\.\\d{1,2})?")) throw new NumberFormatException(); BigDecimal result=new BigDecimal(value); if(result.scale()>2||result.signum()<0||(!zeroAllowed&&result.signum()==0)||result.compareTo(new BigDecimal("999999999999.99"))>0)throw new NumberFormatException(); return result; }
        catch(NumberFormatException e){throw new IllegalArgumentException("金额须为有效数字，最多两位小数");}
    }
    private int count(String sql,Object...args){Integer n=jdbc.queryForObject(sql,Integer.class,args);return n==null?0:n;}
    private void audit(String username,String name,String action,String detail){jdbc.update("INSERT INTO sys_operation_log(username,name,action,detail) VALUES(?,?,?,?)",username,name,action,detail);}
    private void approval(Object contractId,String step,String result,String actor,String actorName,String note){
        jdbc.update("INSERT INTO biz_contract_approval(contract_id,step,result,actor,actor_name,note) VALUES(?,?,?,?,?,?)",contractId,step,result,actor,actorName,note);
    }
}
