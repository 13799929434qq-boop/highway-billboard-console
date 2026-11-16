package com.gonglu.billboard.controller;

import com.gonglu.billboard.dto.LoginReq;
import com.gonglu.billboard.security.CurrentUser;
import com.gonglu.billboard.service.AuthService;
import com.gonglu.billboard.service.UserService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.gonglu.billboard.entity.SysUser;
import com.gonglu.billboard.common.BizException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/session")
public class SessionController {
    private final AuthService authService;
    private final UserService userService;
    private final SecurityContextRepository contexts = new HttpSessionSecurityContextRepository();

    public SessionController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginReq request, HttpServletRequest http, HttpServletResponse response) {
        try {
            Map<String, Object> result = authService.login(request.getUsername(), request.getPassword());
            @SuppressWarnings("unchecked") Map<String, Object> user = (Map<String, Object>) result.get("user");
            CurrentUser principal = new CurrentUser((String) user.get("username"), (String) user.get("name"), (String) user.get("role"));
            SysUser persisted = userService.getOne(Wrappers.<SysUser>lambdaQuery()
                    .eq(SysUser::getUsername, principal.username()));
            if (persisted == null || !persisted.isEnabled() || !persisted.getRole().equalsIgnoreCase(principal.role())
                    || !java.util.Objects.equals(user.get("securityVersion"), persisted.getSecurityVersion()))
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "账号状态已变更，请重新登录"));
            http.changeSessionId();
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().toUpperCase()))));
            SecurityContextHolder.setContext(context);
            contexts.saveContext(context, http, response);
            var session = http.getSession();
            session.setAttribute("securityVersion", persisted.getSecurityVersion());
            session.setMaxInactiveInterval(request.isRememberMe() ? 7 * 24 * 60 * 60 : 30 * 60);
            var cookie = org.springframework.http.ResponseCookie.from("JSESSIONID", session.getId())
                    .httpOnly(true).secure(http.isSecure()).sameSite("Lax").path("/")
                    .maxAge(request.isRememberMe() ? java.time.Duration.ofDays(7) : java.time.Duration.ofSeconds(-1))
                    .build();
            response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString());
            return ResponseEntity.ok(user(principal));
        } catch (BizException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(org.springframework.security.core.Authentication authentication, HttpServletRequest request) {
        CurrentUser principal = (CurrentUser) authentication.getPrincipal();
        SysUser current = userService.getOne(Wrappers.<SysUser>lambdaQuery()
                .eq(SysUser::getUsername, principal.username()));
        Object version = request.getSession().getAttribute("securityVersion");
        if (current == null || !current.isEnabled() || !current.getRole().equalsIgnoreCase(principal.role())
                || !(version instanceof Long) || !version.equals(current.getSecurityVersion())) {
            request.getSession().invalidate();
            SecurityContextHolder.clearContext();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "账号状态已变更，请重新登录"));
        }
        return ResponseEntity.ok(user(principal));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> user(CurrentUser user) {
        return Map.of("id", user.username(), "displayName", user.name(), "roles", List.of(user.role().toUpperCase()));
    }
}
