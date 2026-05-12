package com.worshiproom.auth;

import java.time.Instant;
import java.util.UUID;

/**
 * Typed principal set by {@link JwtAuthenticationFilter}. Controllers inject via
 * {@code @AuthenticationPrincipal AuthenticatedUser user} using Spring Security's
 * built-in resolver — no custom {@code HandlerMethodArgumentResolver} is required.
 *
 * <p>Forums Wave Spec 1.5g adds {@code jti} (the JWT's {@code jti} claim, used
 * by {@code AuthController.logout} to blocklist the current token) and
 * {@code expiresAt} (the token's {@code exp} claim, used to compute the
 * blocklist TTL without re-parsing the JWT).
 *
 * <p>Production code in {@link JwtAuthenticationFilter} always uses the 4-arg
 * canonical form. The 2-arg secondary constructor exists for test fixtures and
 * pre-1.5g compatibility — {@code jti} and {@code expiresAt} are {@code null} in
 * that path. {@code AuthController.logout} handles a {@code null} {@code jti}
 * defensively (it returns 204 silently rather than blocklisting nothing). Match
 * the convention from Decision 1 of the spec plan.
 */
public record AuthenticatedUser(UUID userId, boolean isAdmin, UUID jti, Instant expiresAt) {

    /**
     * 2-arg secondary constructor for tests and pre-1.5g call sites. Production
     * MUST use the 4-arg canonical form so blocklist + TTL flows can function.
     */
    public AuthenticatedUser(UUID userId, boolean isAdmin) {
        this(userId, isAdmin, null, null);
    }
}
