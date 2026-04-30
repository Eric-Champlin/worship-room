package com.worshiproom.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code auth.rate-limit.change-password.*} from application.properties.
 *
 * <p>Per-user rate limit on POST /api/v1/auth/change-password (Spec 1.5c MPD-3).
 * Mirrors {@link com.worshiproom.post.engagement.BookmarksRateLimitConfig}'s shape
 * with auth-specific prefix and a 15-min refill window (vs. bookmarks' 1-hour).
 *
 * <p>Bucket eviction (in {@link ChangePasswordRateLimitService}) is set to 30 min
 * — strictly longer than the 15-min refill window so an attacker cannot force
 * eviction to get a fresh bucket. See Spec 1.5c Watch-For #6.
 */
@Configuration
@ConfigurationProperties(prefix = "auth.rate-limit.change-password")
public class ChangePasswordRateLimitConfig {

    private int capacity = 5;
    private int windowMinutes = 15;
    private int bucketCacheSize = 10_000;

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
    public int getWindowMinutes() { return windowMinutes; }
    public void setWindowMinutes(int windowMinutes) { this.windowMinutes = windowMinutes; }
    public int getBucketCacheSize() { return bucketCacheSize; }
    public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
}
