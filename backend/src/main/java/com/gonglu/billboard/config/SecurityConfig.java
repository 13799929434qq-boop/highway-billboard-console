package com.gonglu.billboard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * 演示环境使用 {noop} 明文密码（种子数据即此格式）。
     * 生产环境请改用 BCryptPasswordEncoder 并重置用户密码。
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.requireCsrfProtectionMatcher(request ->
                        !java.util.Set.of("GET", "HEAD", "OPTIONS", "TRACE").contains(request.getMethod())))
                .cors(cors -> {
                })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/session/csrf", "/api/session/login").permitAll()
                        .requestMatchers("/api/session/**", "/api/management/**", "/api/storage/**").authenticated()
                        .requestMatchers("/api/**").denyAll()
                        .requestMatchers("/doc.html", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**", "/favicon.ico").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(HttpStatus.UNAUTHORIZED.value());
                            res.setContentType("application/json;charset=UTF-8");
                            res.getWriter().write("{\"code\":401,\"msg\":\"未登录或登录已过期\"}");
                        }));
        return http.build();
    }
}
