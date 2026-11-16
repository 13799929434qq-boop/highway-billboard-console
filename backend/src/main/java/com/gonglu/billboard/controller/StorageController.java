package com.gonglu.billboard.controller;

import com.gonglu.billboard.security.CurrentUser;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/storage/files")
public class StorageController {
    private final JdbcTemplate jdbc;
    private final MinioClient client;
    private final String bucket;

    public StorageController(JdbcTemplate jdbc,
            @Value("${storage.endpoint}") String endpoint,
            @Value("${storage.access-key}") String accessKey,
            @Value("${storage.secret-key}") String secretKey,
            @Value("${storage.bucket}") String bucket) {
        this.jdbc = jdbc;
        this.bucket = bucket;
        this.client = accessKey.isBlank() || secretKey.isBlank() ? null :
                MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication authentication, jakarta.servlet.http.HttpServletRequest request) {
        CurrentUser user = current(authentication, request);
        if (!Set.of("archivist", "finance").contains(user.role())) throw new AccessDeniedException("无上传权限");
        if (client == null) return ResponseEntity.status(503).body(Map.of("message", "文件存储服务尚未连接"));
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024)
            return ResponseEntity.badRequest().body(Map.of("message", "文件不能为空且不能超过 10MB"));
        String contentType;
        try (InputStream stream = file.getInputStream()) {
            byte[] signature = stream.readNBytes(8);
            if (signature.length >= 5 && new String(signature, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"))
                contentType = "application/pdf";
            else if (signature.length >= 8 && java.util.Arrays.equals(signature, new byte[]{(byte)0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a}))
                contentType = "image/png";
            else if (signature.length >= 3 && (signature[0]&255)==255 && (signature[1]&255)==216 && (signature[2]&255)==255)
                contentType = "image/jpeg";
            else return ResponseEntity.badRequest().body(Map.of("message", "仅支持 PDF、PNG 或 JPEG 文件"));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "读取文件失败"));
        }
        String id = UUID.randomUUID().toString();
        String objectKey = "uploads/" + id;
        String original = file.getOriginalFilename() == null ? "附件" : file.getOriginalFilename().replaceAll("[\\\\/\\r\\n]", "_");
        if (original.length() > 255) original = original.substring(original.length()-255);
        try {
            if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
                try { client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build()); }
                catch (Exception e) { if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) throw e; }
            }
            try (InputStream stream = file.getInputStream()) {
                client.putObject(PutObjectArgs.builder().bucket(bucket).object(objectKey)
                        .stream(stream, file.getSize(), -1).contentType(contentType).build());
            }
            try {
                jdbc.update("INSERT INTO sys_uploaded_file(id,object_key,original_name,content_type,byte_size,uploaded_by) VALUES(?,?,?,?,?,?)",
                        id, objectKey, original, contentType, file.getSize(), user.username());
            } catch (RuntimeException e) {
                try { client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(objectKey).build()); } catch (Exception ignored) {}
                throw e;
            }
            return ResponseEntity.ok(Map.of("id", id, "name", original));
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("message", "文件存储暂时不可用，请稍后重试"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> download(@PathVariable String id, @RequestParam(defaultValue = "false") boolean inline, Authentication authentication, jakarta.servlet.http.HttpServletRequest request) {
        CurrentUser user = current(authentication, request);
        var rows = jdbc.queryForList("SELECT object_key,original_name,content_type,uploaded_by FROM sys_uploaded_file WHERE id=?", id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        var item = rows.get(0);
        boolean allowed = user.username().equals(item.get("uploaded_by"));
        if (!allowed && Set.of("leader", "finance", "archivist").contains(user.role())) {
            Integer linked = jdbc.queryForObject("""
                SELECT (SELECT COUNT(*) FROM biz_asset_certificate WHERE file_key=?)
                     + (SELECT COUNT(*) FROM biz_billboard WHERE FIND_IN_SET(?,photos)>0 OR land_document_key=?)
                     + (SELECT COUNT(*) FROM biz_contract WHERE file_key=? AND ? IN ('leader','finance'))
                     + (SELECT COUNT(*) FROM biz_transaction WHERE file_key=? AND ?='finance')
                     + (SELECT COUNT(*) FROM biz_invoice WHERE file_key=? AND ?='finance')
                """, Integer.class, id, id, id, id, user.role(), id, user.role(), id, user.role());
            allowed = linked != null && linked > 0;
        }
        if (!allowed) throw new AccessDeniedException("无查看此附件的权限");
        if (client == null) return ResponseEntity.status(503).build();
        try {
            var stream = client.getObject(GetObjectArgs.builder().bucket(bucket).object((String)item.get("object_key")).build());
            boolean canInline = inline && Set.of("image/png", "image/jpeg").contains((String)item.get("content_type"));
            var disposition = canInline ? ContentDisposition.inline() : ContentDisposition.attachment();
            return ResponseEntity.ok()
                    .header("X-Content-Type-Options", "nosniff")
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.filename((String)item.get("original_name"), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                    .contentType(MediaType.parseMediaType((String)item.get("content_type")))
                    .body(new InputStreamResource(stream));
        } catch (Exception e) {
            return ResponseEntity.status(503).build();
        }
    }
    private CurrentUser current(Authentication authentication, jakarta.servlet.http.HttpServletRequest request) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUser user))
            throw new AccessDeniedException("登录状态失效");
        Integer active = jdbc.queryForObject("SELECT COUNT(*) FROM sys_user WHERE username=? AND status='启用' AND role=? AND security_version=?",
                Integer.class, user.username(), user.role(), request.getSession().getAttribute("securityVersion"));
        if (active == null || active != 1) throw new AccessDeniedException("账号状态已变更");
        return user;
    }
}
