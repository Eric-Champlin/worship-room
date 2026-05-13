package com.worshiproom.quicklift;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.quicklift.start.*} from application.properties.
 *
 * <p>Per-user rate limit on POST /api/v1/quick-lift/start (Spec 6.2). Defaults
 * are prod-strict (10/min); dev profile overrides to 30/min. Mirrors the
 * shape of {@link com.worshiproom.auth.ChangePasswordRateLimitConfig}: single
 * {@code requestsPerMinute} drives both the bucket capacity and the refill
 * rate via {@code Bandwidth.classic} — there is no separate burst tunable.
 *
 * <p>Bucket eviction in {@link QuickLiftStartRateLimitService} is set to 5 min —
 * strictly longer than the 1-min refill window so an attacker cannot force
 * eviction to get a fresh bucket.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.quicklift.start")
public class QuickLiftStartRateLimitConfig {

    private int requestsPerMinute = 10;
    private int bucketCacheSize = 10_000;

    public int getRequestsPerMinute() { return requestsPerMinute; }
    public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
    public int getBucketCacheSize() { return bucketCacheSize; }
    public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
}
