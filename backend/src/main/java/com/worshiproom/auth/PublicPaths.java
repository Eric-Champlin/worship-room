package com.worshiproom.auth;

import java.util.List;

/**
 * Single source of truth for public (unauthenticated) route patterns.
 * Consumed by both SecurityConfig.requestMatchers(...) and
 * JwtAuthenticationFilter.shouldNotFilter(...) to keep auth behavior
 * consistent — garbage Bearer tokens on public routes are IGNORED,
 * not rejected with 401.
 *
 * Adding a new public route: add the pattern here; both call sites
 * pick it up automatically.
 */
public final class PublicPaths {
    private PublicPaths() {}

    public static final List<String> PATTERNS = List.of(
        "/api/v1/health",
        "/api/health",
        "/api/hello",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/proxy/**",
        "/actuator/health",
        "/actuator/info"
    );
}
