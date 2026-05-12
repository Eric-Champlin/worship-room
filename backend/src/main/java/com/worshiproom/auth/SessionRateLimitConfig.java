package com.worshiproom.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Forums Wave Spec 1.5g — binds {@code auth.rate-limit.sessions.*}.
 *
 * <p>Per-user limits on the {@code /api/v1/sessions/*} family. Mirrors the
 * {@link ChangePasswordRateLimitConfig} pattern field-for-field.
 *
 * <p>Bucket eviction (in {@link SessionRateLimitService}) is set to 90 min so the
 * eviction window is strictly LONGER than the default 60-min refill window —
 * matches the rule from Spec 1.5c Watch-For #6: eviction shorter than refill would
 * let an attacker evict and get a fresh bucket.
 */
@Configuration
@ConfigurationProperties(prefix = "auth.rate-limit.sessions")
public class SessionRateLimitConfig {

    private int capacity = 10;
    private int windowMinutes = 60;
    private int bucketCacheSize = 10_000;

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
    public int getWindowMinutes() { return windowMinutes; }
    public void setWindowMinutes(int windowMinutes) { this.windowMinutes = windowMinutes; }
    public int getBucketCacheSize() { return bucketCacheSize; }
    public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
}
