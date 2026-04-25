package com.worshiproom.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security response headers for every HTTP response Worship Room emits.
 *
 * <p>Modeled on {@link CorsConfig} for architectural symmetry: a servlet
 * {@link OncePerRequestFilter} registered as a {@link FilterRegistrationBean}
 * at {@code HIGHEST_PRECEDENCE + 6}. One slot after {@code CorsFilter} (+5)
 * so MDC and CORS headers are populated first; before
 * {@code RateLimitFilter} (+10), {@code LoginRateLimitFilter} (+20), and
 * {@code JwtAuthenticationFilter} so security headers survive responses those
 * filters write via {@code handlerExceptionResolver.resolveException(...)}.
 *
 * <p>Why a filter, not Spring Security's declarative {@code http.headers()} API:
 * the Spec 1.10 cutover surfaced that filter-raised 401/429 responses bypass
 * Spring Security's response-decoration layer entirely. Same gap CORS hit;
 * same fix.
 *
 * <p>Header values are code constants &mdash; security headers are policy, not
 * config. Tuning lives in {@code backend/docs/runbook-security-headers.md}.
 */
@Configuration
public class SecurityHeadersConfig {

    static final String HSTS_VALUE =
        "max-age=31536000; includeSubDomains";

    static final String X_CONTENT_TYPE_OPTIONS_VALUE = "nosniff";

    static final String X_FRAME_OPTIONS_VALUE = "DENY";

    static final String REFERRER_POLICY_VALUE = "strict-origin-when-cross-origin";

    static final String CSP_VALUE = String.join("; ",
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://worship-room-production.up.railway.app https://api.spotify.com",
        "frame-src 'self' https://open.spotify.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
    );

    static final String PERMISSIONS_POLICY_VALUE = String.join(", ",
        "accelerometer=()",
        "camera=()",
        "geolocation=(self)",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()"
    );

    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilterRegistration() {
        FilterRegistrationBean<SecurityHeadersFilter> registration =
            new FilterRegistrationBean<>(new SecurityHeadersFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 6);
        registration.addUrlPatterns("/*");
        return registration;
    }

    static class SecurityHeadersFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain chain) throws ServletException, IOException {
            response.setHeader("Strict-Transport-Security", HSTS_VALUE);
            response.setHeader("X-Content-Type-Options", X_CONTENT_TYPE_OPTIONS_VALUE);
            response.setHeader("X-Frame-Options", X_FRAME_OPTIONS_VALUE);
            response.setHeader("Referrer-Policy", REFERRER_POLICY_VALUE);
            response.setHeader("Content-Security-Policy", CSP_VALUE);
            response.setHeader("Permissions-Policy", PERMISSIONS_POLICY_VALUE);
            chain.doFilter(request, response);
        }
    }
}
