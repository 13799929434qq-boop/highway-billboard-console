package com.gonglu.billboard.controller;

import com.gonglu.billboard.security.CurrentUser;
import com.gonglu.billboard.service.FinanceActionService;
import java.util.Map;
import java.util.List;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/management")
public class ManagementActionController {
    public record Action(String type, Map<String, String> values, String requestId) {}
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final FinanceActionService finance;
    public ManagementActionController(JdbcTemplate jdbc, PasswordEncoder encoder, FinanceActionService finance) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.finance = finance;
    }
    @PostMapping("/actions")
    @Transactional
    public ResponseEntity<?> action(@RequestBody Action action, Authentication authentication, jakarta.servlet.http.HttpServletRequest request) {
        if (!(authentication.getPrincipal() instanceof CurrentUser user)) {
            throw new AccessDeniedException("当前账号无管理权限");
        }
        Integer active = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_user WHERE username=? AND status='启用' AND role=? AND security_version=?",
                Integer.class, user.username(), user.role(), request.getSession().getAttribute("securityVersion"));
        if (active == null || active != 1) throw new AccessDeniedException("账号状态已变更");
        if (action.values() == null || action.type() == null) return bad("请求内容不完整");
        Map<String, String> v = action.values();
        boolean financeAction = Set.of("saveCustomer", "blacklist", "saveContract", "saveRent", "saveRentSchedule", "submitContract", "activate", "saveReceipt", "allocate", "saveExpense", "saveInvoice", "saveContractDraft").contains(action.type());
        boolean leaderAction = Set.of("bossApprove", "bossReject").contains(action.type());
        boolean operationsAction = Set.of("saveOrganization", "saveAsset", "saveCertificate", "saveAssetDraft", "deleteAsset").contains(action.type());
        if (leaderAction ? !user.role().equalsIgnoreCase("leader") : financeAction ? !user.role().equalsIgnoreCase("finance") : operationsAction ? !user.role().equalsIgnoreCase("archivist") : !user.role().equalsIgnoreCase("admin"))
            throw new AccessDeniedException("当前账号无此操作权限");
        if (financeAction || leaderAction) {
            if (Set.of("saveReceipt", "allocate", "activate", "submitContract", "bossApprove", "bossReject").contains(action.type())) {
                try {
                    java.util.UUID.fromString(action.requestId());
                } catch (RuntimeException e) {
                    return bad("请求编号无效，请刷新页面重试");
                }
                String hash;
                try {
                    String payload = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(new java.util.TreeMap<>(v));
                    hash = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                            .digest((action.type() + "\n" + payload).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                } catch (Exception e) {
                    throw new IllegalStateException("无法生成请求摘要", e);
                }
                try {
                    jdbc.update("INSERT INTO sys_action_request(request_id,username,action_type,payload_hash) VALUES(?,?,?,?)",
                            action.requestId(), user.username(), action.type(), hash);
                } catch (org.springframework.dao.DuplicateKeyException e) {
                    var previous = jdbc.queryForList("SELECT username,action_type,payload_hash FROM sys_action_request WHERE request_id=? FOR UPDATE", action.requestId());
                    if (!previous.isEmpty() && user.username().equals(previous.get(0).get("username"))
                            && action.type().equals(previous.get(0).get("action_type"))
                            && hash.equals(previous.get(0).get("payload_hash"))) return ResponseEntity.noContent().build();
                    return ResponseEntity.status(409).body(Map.of("message", "请求编号已用于其他操作，请刷新页面"));
                }
            }
            return finance.execute(action.type(), v, user.username(), user.name());
        }
        if (action.type().equals("saveAccount") || action.type().equals("toggleAccount")) {
            jdbc.queryForList("SELECT id FROM sys_user WHERE role='admin' ORDER BY id FOR UPDATE");
        }
        switch (action.type()) {
            case "saveOrganization": {
                String name = v.getOrDefault("name", "").trim();
                String kind = v.getOrDefault("type", "");
                String parent = v.getOrDefault("parent", "").trim();
                if (name.isBlank() || !Set.of("路段", "地区", "运营单位").contains(kind))
                    return bad("请填写有效名称并选择档案层级");
                if (kind.equals("路段")) {
                    if (!parent.isBlank()) return bad("路段无需选择上级档案");
                } else {
                    if (parent.isBlank()) return bad("请选择上级档案");
                    var parents = jdbc.queryForList("SELECT kind FROM biz_organization WHERE id=? AND status='启用' FOR UPDATE", parent);
                    String expected = kind.equals("地区") ? "路段" : "地区";
                    if (parents.isEmpty() || !expected.equals(parents.get(0).get("kind")))
                        return bad("上级档案层级不匹配");
                }
                Integer duplicate = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM biz_organization WHERE name=? AND kind=? AND parent_key=COALESCE(NULLIF(?,''),0)",
                    Integer.class, name, kind, parent);
                if (duplicate != null && duplicate > 0) return bad("该上级下已有同名档案");
                jdbc.update("INSERT INTO biz_organization(name,kind,parent_id,status) VALUES(?,?,NULLIF(?,''),'启用')",
                    name, kind, parent);
                audit(user.username(), user.name(), "新增组织档案", kind + "/" + name);
                return ResponseEntity.noContent().build();
            }
            case "saveAsset": {
                String code = v.getOrDefault("id", "").trim();
                String name = v.getOrDefault("name", "").trim();
                String road = v.getOrDefault("road", "").trim();
                String region = v.getOrDefault("region", "").trim();
                String unit = v.getOrDefault("unit", "").trim();
                String contractStake = v.getOrDefault("contractStake", "").trim();
                String actualStake = v.getOrDefault("actualStake", "").trim();
                String approvedStake = v.getOrDefault("approvedStake", "").trim();
                if (code.isBlank() || name.isBlank() || contractStake.isBlank() || actualStake.isBlank() || approvedStake.isBlank())
                    return bad("请填写广告牌编号、名称及三个桩号");
                var existing = jdbc.queryForList("SELECT id,ownership,land_nature,spec,asset_nature,deleted FROM biz_billboard WHERE code=? FOR UPDATE", code);
                boolean editing = "是".equals(v.get("editing"));
                if (editing && existing.isEmpty()) return bad("广告牌不存在");
                if (editing && (Boolean.TRUE.equals(existing.get(0).get("deleted"))
                        || existing.get(0).get("deleted") instanceof Number n && n.intValue() != 0))
                    return bad("广告牌已删除");
                if (!editing && !existing.isEmpty()) return bad("广告牌编号已存在");
                String[] keys = {"ownership", "land", "specification"};
                String[] categories = {"产权", "用地性质", "规格"};
                String[] columns = {"ownership", "land_nature", "spec"};
                for (int i = 0; i < keys.length; i++) {
                    String value = v.getOrDefault(keys[i], "").trim();
                    Integer enabled = jdbc.queryForObject(
                            "SELECT COUNT(*) FROM sys_dict_item WHERE dict_type=? AND label=? AND status='启用'",
                            Integer.class, categories[i], value);
                    boolean unchanged = editing && value.equals(existing.get(0).get(columns[i]));
                    if (value.isBlank() || ((enabled == null || enabled == 0) && !unchanged))
                        return bad(categories[i] + "必须选择已启用的字典项");
                }
                String nature = v.getOrDefault("nature", "").trim();
                if (!nature.isBlank()) {
                    Integer enabled = jdbc.queryForObject(
                            "SELECT COUNT(*) FROM sys_dict_item WHERE dict_type='性质' AND label=? AND status='启用'",
                            Integer.class, nature);
                    boolean unchanged = editing && nature.equals(existing.get(0).get("asset_nature"));
                    if ((enabled == null || enabled == 0) && !unchanged) return bad("性质必须选择已启用的字典项");
                }
                for (String key : List.of("photos", "landDocument")) {
                    String files = v.getOrDefault(key, "").trim();
                    if (files.length() > 1000) return bad("附件数量过多");
                    if (key.equals("landDocument") && files.contains(",")) return bad("土地资料格式不正确");
                    for (String fileId : files.isEmpty() ? List.<String>of() : List.of(files.split(","))) {
                        Integer authorized = jdbc.queryForObject("""
                            SELECT COUNT(*) FROM sys_uploaded_file f WHERE f.id=? AND
                            (f.uploaded_by=? OR EXISTS (
                                SELECT 1 FROM biz_billboard b WHERE b.code=? AND
                                (FIND_IN_SET(f.id,b.photos)>0 OR b.land_document_key=f.id)))
                            """, Integer.class, fileId, user.username(), code);
                        if (authorized == null || authorized == 0) return bad("附件不存在或无权使用");
                    }
                }
                var units = jdbc.queryForList("""
                    SELECT u.id FROM biz_organization u
                    JOIN biz_organization d ON d.id=u.parent_id AND d.kind='地区' AND d.status='启用'
                    JOIN biz_organization r ON r.id=d.parent_id AND r.kind='路段' AND r.status='启用'
                    WHERE u.kind='运营单位' AND u.status='启用' AND u.name=? AND d.name=? AND r.name=?
                    """, unit, region, road);
                if (units.size() != 1) return bad("路段、地区与运营单位的归属关系不匹配");
                Long unitId = ((Number) units.get(0).get("id")).longValue();
                var sections = jdbc.queryForList("SELECT id FROM biz_section WHERE name=? AND region=? AND operator=? LIMIT 1",
                        road, region, unit);
                long sectionId;
                if (sections.isEmpty()) {
                    String sectionCode = "ORG-" + java.util.UUID.randomUUID();
                    jdbc.update("INSERT INTO biz_section(code,name,region,operator) VALUES(?,?,?,?)", sectionCode, road, region, unit);
                    sectionId = jdbc.queryForObject("SELECT id FROM biz_section WHERE code=?", Long.class, sectionCode);
                } else sectionId = ((Number) sections.get(0).get("id")).longValue();
                Object[] fields = {name, sectionId, unitId, v.getOrDefault("ownership", ""),
                        v.getOrDefault("land", ""), contractStake, actualStake, approvedStake,
                        v.getOrDefault("specification", ""), v.getOrDefault("address", ""),
                        v.getOrDefault("photos", ""), v.getOrDefault("landDocument", ""), nature, code};
                if (editing) {
                    jdbc.update("""
                        UPDATE biz_billboard SET display_name=?,section_id=?,organization_unit_id=?,ownership=?,land_nature=?,
                        stake_contract=?,stake_actual=?,stake_approval=?,spec=?,address=?,photos=?,land_document_key=NULLIF(?,''),asset_nature=? WHERE code=?
                        """, fields);
                } else {
                    jdbc.update("""
                        INSERT INTO biz_billboard(display_name,section_id,organization_unit_id,ownership,land_nature,
                        stake_contract,stake_actual,stake_approval,spec,address,photos,land_document_key,asset_nature,code)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,NULLIF(?,''),?,?)
                        """, fields);
                }
                audit(user.username(), user.name(), editing ? "编辑广告牌" : "新增广告牌", code);
                return ResponseEntity.noContent().build();
            }
            case "saveCertificate": {
                String code = v.getOrDefault("assetId", "").trim();
                String type = v.getOrDefault("type", "").trim();
                String number = v.getOrDefault("number", "").trim();
                String issued = v.getOrDefault("issued", "").trim();
                String expires = v.getOrDefault("expires", "").trim();
                String reason = v.getOrDefault("reason", "").trim();
                String file = v.getOrDefault("file", "").trim();
                if (code.isBlank() || number.isBlank() || reason.isBlank() || file.isBlank()
                        || !Set.of("路政批复", "保险", "年审").contains(type))
                    return bad("请完整填写证件资料并上传附件");
                try {
                    if (java.time.LocalDate.parse(expires).isBefore(java.time.LocalDate.parse(issued)))
                        return bad("证件有效期不得早于签发日期");
                } catch (java.time.format.DateTimeParseException e) {
                    return bad("证件日期格式不正确");
                }
                var assets = jdbc.queryForList("SELECT id FROM biz_billboard WHERE code=? AND deleted=0 FOR UPDATE", code);
                if (assets.isEmpty()) return bad("广告牌不存在");
                Integer owned = jdbc.queryForObject("SELECT COUNT(*) FROM sys_uploaded_file WHERE id=? AND uploaded_by=?",
                        Integer.class, file, user.username());
                if (owned == null || owned != 1) return bad("附件不存在或无权使用");
                long assetId = ((Number) assets.get(0).get("id")).longValue();
                Integer nextVersion = jdbc.queryForObject("SELECT COALESCE(MAX(version),0)+1 FROM biz_asset_certificate WHERE billboard_id=? AND certificate_type=?",
                        Integer.class, assetId, type);
                jdbc.update("UPDATE biz_asset_certificate SET is_current=0 WHERE billboard_id=? AND certificate_type=?", assetId, type);
                jdbc.update("""
                    INSERT INTO biz_asset_certificate(billboard_id,certificate_type,certificate_number,issued_date,expiry_date,file_key,version,is_current,reason)
                    VALUES(?,?,?,?,?,?,?,1,?)
                    """, assetId, type, number, issued, expires, file, nextVersion, reason);
                audit(user.username(), user.name(), "更新证件", code + "/" + type);
                return ResponseEntity.noContent().build();
            }
            case "saveAssetDraft": {
                String code = v.getOrDefault("assetId", "").trim();
                String reason = v.getOrDefault("reason", "").trim();
                String date = v.getOrDefault("date", "").trim();
                String change = v.getOrDefault("changeType", "").trim();
                if (code.isEmpty() || reason.isEmpty() || !Set.of("移位", "拆除").contains(change))
                    return bad("请完整填写广告牌、变动类型和原因");
                try { java.time.LocalDate.parse(date); }
                catch (java.time.format.DateTimeParseException e) { return bad("日期格式不正确"); }
                var assets = jdbc.queryForList("SELECT id FROM biz_billboard WHERE code=? AND deleted=0", code);
                if (assets.isEmpty()) return bad("广告牌不存在");
                jdbc.update("INSERT INTO biz_change_draft(kind,billboard_id,change_type,proposed_date,reason) VALUES('资产变动',?,?,?,?)",
                        assets.get(0).get("id"), change, date, reason);
                audit(user.username(), user.name(), "保存资产变动草稿", code + "/" + change);
                return ResponseEntity.noContent().build();
            }
            case "deleteAsset": {
                String code = v.getOrDefault("id", "").trim();
                var assets = jdbc.queryForList("SELECT id FROM biz_billboard WHERE code=? AND deleted=0 FOR UPDATE", code);
                if (assets.isEmpty()) return bad("广告牌不存在");
                long id = ((Number)assets.get(0).get("id")).longValue();
                Integer references = jdbc.queryForObject("""
                    SELECT (SELECT COUNT(*) FROM biz_contract_annual_rent WHERE billboard_id=?)
                         + (SELECT COUNT(*) FROM biz_contract_item WHERE billboard_id=?)
                         + (SELECT COUNT(*) FROM biz_asset_certificate WHERE billboard_id=?)
                         + (SELECT COUNT(*) FROM biz_receivable WHERE billboard_id=?)
                         + (SELECT COUNT(*) FROM biz_change_draft WHERE billboard_id=?)
                         + (SELECT COUNT(*) FROM biz_transaction WHERE billboard_id=?)
                    """, Integer.class, id,id,id,id,id,id);
                if (references != null && references > 0) return bad("存在合同、证件或历史记录，不能删除");
                jdbc.update("UPDATE biz_billboard SET deleted=1,deleted_at=CURRENT_TIMESTAMP WHERE id=?",id);
                audit(user.username(),user.name(),"删除广告牌",code);
                return ResponseEntity.noContent().build();
            }
            case "saveAccount": {
                String username = v.getOrDefault("username", "").trim();
                String name = v.getOrDefault("name", "").trim();
                String role = v.getOrDefault("role", "");
                String scope = v.getOrDefault("scope", "");
                if (username.isBlank() || name.isBlank() || !Set.of("leader", "operations", "finance", "admin").contains(role))
                    return bad("请填写有效的账号、姓名和角色");
                if (!scope.equals("全部授权范围"))
                    return bad("指定数据范围尚未接入，请选择全部授权范围");
                String storedRole = role.equals("operations") ? "archivist" : role;
                String id = v.getOrDefault("id", "");
                String unit = v.getOrDefault("unit", "").trim();
                String password = v.getOrDefault("password", "");
                if (id.isBlank()) {
                    if (password.length() < 6) return bad("新账号密码至少需要 6 个字符");
                    if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM sys_user WHERE username=?)", Boolean.class, username)))
                        return bad("账号已存在");
                    jdbc.update("INSERT INTO sys_user(username,password,name,role,status,unit) VALUES(?,?,?,?,?,?)",
                            username, encoder.encode(password), name, storedRole, "启用", unit);
                } else {
                    var rows = jdbc.queryForList("SELECT username,role,status FROM sys_user WHERE id=? FOR UPDATE", id);
                    if (rows.isEmpty()) return bad("账号不存在");
                    var old = rows.get(0);
                    if (user.username().equals(old.get("username")) &&
                            (!username.equals(old.get("username")) || !storedRole.equals("admin")))
                        return bad("不能修改当前管理员的账号或角色");
                    if ("admin".equals(old.get("role")) && "启用".equals(old.get("status")) && !storedRole.equals("admin")
                            && enabledAdmins() <= 1) return bad("至少保留一个启用的管理员");
                    Integer duplicate = jdbc.queryForObject("SELECT COUNT(*) FROM sys_user WHERE username=? AND id<>?", Integer.class, username, id);
                    if (duplicate != null && duplicate > 0) return bad("账号已存在");
                    if (!password.isBlank() && password.length() < 6) return bad("密码至少需要 6 个字符");
                    jdbc.update("UPDATE sys_user SET username=?,name=?,role=?,unit=?,security_version=security_version+1 WHERE id=?", username, name, storedRole, unit, id);
                    if (!password.isBlank()) jdbc.update("UPDATE sys_user SET password=? WHERE id=?", encoder.encode(password), id);
                }
                audit(user.username(), user.name(), "保存账号", username);
                return ResponseEntity.noContent().build();
            }
            case "toggleAccount": {
                String id = v.getOrDefault("id", "");
                var rows = jdbc.queryForList("SELECT username,role,status FROM sys_user WHERE id=? FOR UPDATE", id);
                if (rows.isEmpty()) return bad("账号不存在");
                var target = rows.get(0);
                if (user.username().equals(target.get("username"))) return bad("不能停用自己的账号");
                boolean enabled = "启用".equals(target.get("status"));
                if (enabled && "admin".equals(target.get("role")) && enabledAdmins() <= 1)
                    return bad("至少保留一个启用的管理员");
                jdbc.update("UPDATE sys_user SET status=?,security_version=security_version+1 WHERE id=?", enabled ? "停用" : "启用", id);
                audit(user.username(), user.name(), enabled ? "停用账号" : "启用账号", String.valueOf(target.get("username")));
                return ResponseEntity.noContent().build();
            }
            case "saveDictionary": {
                String category = v.getOrDefault("category", "").trim();
                String name = v.getOrDefault("name", "").trim();
                String code = v.getOrDefault("code", "").trim();
                String orderText = v.getOrDefault("order", "").trim();
                if (category.isBlank() || name.isBlank() || code.isBlank())
                    return bad("请填写字典分类、名称和编码");
                int order;
                try {
                    order = Integer.parseInt(orderText);
                } catch (NumberFormatException e) {
                    return bad("排序必须是整数");
                }
                Integer duplicate = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM sys_dict_item WHERE dict_type=? AND item_code=?", Integer.class, category, code);
                if (duplicate != null && duplicate > 0) return bad("该分类下的字典编码已存在");
                jdbc.update("INSERT INTO sys_dict(type,name) VALUES(?,?) ON DUPLICATE KEY UPDATE type=VALUES(type)", category, category);
                jdbc.update("INSERT INTO sys_dict_item(dict_type,label,item_code,sort,status) VALUES(?,?,?,?,?)",
                        category, name, code, order, "启用");
                audit(user.username(), user.name(), "新增字典", category + "/" + name);
                return ResponseEntity.noContent().build();
            }
            case "toggleDictionary": {
                var rows = jdbc.queryForList("SELECT dict_type,label,status FROM sys_dict_item WHERE id=? FOR UPDATE", v.getOrDefault("id", ""));
                if (rows.isEmpty()) return bad("字典项不存在");
                var item = rows.get(0);
                boolean enabled = "启用".equals(item.get("status"));
                jdbc.update("UPDATE sys_dict_item SET status=? WHERE id=?", enabled ? "停用" : "启用", v.get("id"));
                audit(user.username(), user.name(), enabled ? "停用字典" : "启用字典",
                        item.get("dict_type") + "/" + item.get("label"));
                return ResponseEntity.noContent().build();
            }
            case "savePermissions": {
                String role = v.getOrDefault("role", "");
                String scope = v.getOrDefault("scope", "");
                if (!Set.of("leader", "operations", "finance", "admin").contains(role))
                    return bad("角色不正确");
                if (!scope.equals("全部授权范围"))
                    return bad("指定范围的权限控制尚未接入，请选择全部授权范围");
                jdbc.update("""
                    INSERT INTO sys_role_permission(role_code,scope,roads) VALUES(?,?,?)
                    ON DUPLICATE KEY UPDATE scope=VALUES(scope),roads=VALUES(roads)
                    """,role,scope,v.getOrDefault("roads","").trim());
                audit(user.username(),user.name(),"保存角色范围",role+"/"+scope);
                return ResponseEntity.noContent().build();
            }
            default:
                return ResponseEntity.status(501).body(Map.of("message", "该操作正在接入后端"));
        }
    }
    private int enabledAdmins() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM sys_user WHERE role='admin' AND status='启用'", Integer.class);
        return count == null ? 0 : count;
    }
    private void audit(String username, String name, String action, String detail) {
        jdbc.update("INSERT INTO sys_operation_log(username,name,action,detail) VALUES(?,?,?,?)", username, name, action, detail);
    }
    private ResponseEntity<Map<String, String>> bad(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
