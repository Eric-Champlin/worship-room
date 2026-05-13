package com.worshiproom.quicklift;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.quicklift.complete.*} from application.properties.
 *
 * <p>Per-user defense-in-depth rate limit on POST
 * /api/v1/quick-lift/{sessionId}/complete (Spec 6.2). Default prod: 30/min —
 * far above legitimate use (1 complete every 2 seconds), so a hit indicates
 * abuse rather than a normal user racing through Quick Lifts. Mirrors the
 * shape of {@link com.worshiproom.auth.ChangePasswordRateLimitConfig}: single
 * {@code requestsPerMinute} drives both the bucket capacity and the refill
 * rate via {@code Bandwidth.classic} — there is no separate burst tunable.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.quicklift.complete")
public class QuickLiftCompleteRateLimitConfig {

    private int requestsPerMinute = 30;
    private int bucketCacheSize = 10_000;

    public int getRequestsPerMinute() { return requestsPerMinute; }
    public void setRequestsPerMinute(int requestsPerMinute) { this.requestsPerMinute = requestsPerMinute; }
    public int getBucketCacheSize() { return bucketCacheSize; }
    public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
}
