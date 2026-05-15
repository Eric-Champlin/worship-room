package com.worshiproom.presence;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Spec 6.11b — binds {@code worshiproom.presence.anon-rate-limit.*} for
 * anonymous callers of {@code GET /api/v1/prayer-wall/presence}, keyed by
 * client IP (resolved via {@link com.worshiproom.proxy.common.IpResolver}).
 *
 * <p>Per master plan body, anonymous limit is 60/min/IP (NOT 120/min/cookie-session
 * as the brief suggested — master plan wins on conflict per
 * {@code 03-backend-standards.md} § Authority hierarchy).
 *
 * <p>Bucket map bounded per Phase 3 Addendum item 5.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.presence.anon-rate-limit")
public class PresenceAnonRateLimitConfig {

    private int requestsPerMinute = 60;
    private int bucketMapMaxSize = 10_000;
    private int bucketMapTtlMinutes = 5;

    public int getRequestsPerMinute() { return requestsPerMinute; }
    public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
    public int getBucketMapMaxSize() { return bucketMapMaxSize; }
    public void setBucketMapMaxSize(int bucketMapMaxSize) { this.bucketMapMaxSize = bucketMapMaxSize; }
    public int getBucketMapTtlMinutes() { return bucketMapTtlMinutes; }
    public void setBucketMapTtlMinutes(int bucketMapTtlMinutes) { this.bucketMapTtlMinutes = bucketMapTtlMinutes; }
}
