package com.worshiproom.auth;

import java.util.UUID;

/**
 * Typed principal set by JwtAuthenticationFilter. Controllers inject via
 * {@code @AuthenticationPrincipal AuthenticatedUser user} using Spring
 * Security's built-in resolver — no custom HandlerMethodArgumentResolver
 * is required.
 */
public record AuthenticatedUser(UUID userId, boolean isAdmin) {}
