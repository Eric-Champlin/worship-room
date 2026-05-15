package com.worshiproom.presence;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Spec 6.11b — binds {@code worshiproom.presence.auth-rate-limit.*} for
 * authenticated callers of {@code GET /api/v1/prayer-wall/presence}.
 * Mirrors {@link com.worshiproom.verse.VerseFindsYouRateLimitConfig} shape.
 *
 * <p>Per Phase 3 Addendum item 5 / 02-security.md § "BOUNDED EXTERNAL-INPUT CACHES":
 * the per-user bucket map is bounded ({@code bucketMapMaxSize}) with TTL-based
 * eviction ({@code bucketMapTtlMinutes}, slightly longer than the rate window) to
 * prevent unbounded growth.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.presence.auth-rate-limit")
public class PresenceAuthRateLimitConfig {

    private int requestsPerMinute = 120;
    private int bucketMapMaxSize = 10_000;
    private int bucketMapTtlMinutes = 5;

    public int getRequestsPerMinute() { return requestsPerMinute; }
    public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
    public int getBucketMapMaxSize() { return bucketMapMaxSize; }
    public void setBucketMapMaxSize(int bucketMapMaxSize) { this.bucketMapMaxSize = bucketMapMaxSize; }
    public int getBucketMapTtlMinutes() { return bucketMapTtlMinutes; }
    public void setBucketMapTtlMinutes(int bucketMapTtlMinutes) { this.bucketMapTtlMinutes = bucketMapTtlMinutes; }
}
