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
        "/api/v1/auth/logout",
        "/api/v1/proxy/**",
        "/actuator/health",
        "/actuator/health/liveness",
        "/actuator/health/readiness",
        "/actuator/info"
    );

    /**
     * Routes that accept BOTH authenticated and anonymous requests.
     * SecurityConfig uses permitAll() on these so anonymous viewers pass;
     * JwtAuthenticationFilter does NOT skip them, so a valid Bearer token
     * still extracts a principal (enabling personalized filtering — e.g.,
     * friends-visibility posts in Spec 3.3).
     *
     * <p>Behavior matrix on these routes:
     * <ul>
     *   <li>No Authorization header → null principal → controller filters as anonymous</li>
     *   <li>Valid Bearer token → AuthenticatedUser principal set → controller personalizes</li>
     *   <li>Invalid Bearer token → 401 (per JwtAuthenticationFilter exception path)</li>
     * </ul>
     *
     * <p>DO NOT add routes here that have any authenticated-only behavior —
     * those belong in the .authenticated() bucket. Only routes whose
     * anonymous experience is intentional (public feed, public post detail,
     * public profile pages).
     *
     * <p>Pattern note: Spring's AntPathMatcher interprets {@code *} as
     * "match exactly one path segment, no slashes." So {@code /api/v1/posts/*}
     * matches {@code /api/v1/posts/{id}} but NOT {@code /api/v1/posts/{id}/comments}
     * (Spec 3.4 owns nested routes).
     */
    public static final List<String> OPTIONAL_AUTH_PATTERNS = List.of(
        "/api/v1/posts",
        "/api/v1/posts/*",
        "/api/v1/posts/*/comments",
        "/api/v1/users/*/posts",
        "/api/v1/qotd/today",
        // Spec 1.10e — DevStorageController is @Profile("dev"), so this pattern is
        // unreachable under test/prod (no controller listens, request 404s via the MVC
        // dispatcher). The HMAC signature check inside the controller is the actual
        // authorization mechanism for dev-mode presigned URLs.
        "/dev-storage/**"
    );
}
