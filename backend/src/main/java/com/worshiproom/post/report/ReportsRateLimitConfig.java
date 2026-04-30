package com.worshiproom.post.report;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.reports.rate-limit.*} from application.properties.
 *
 * <p>The rate limit applies to {@code POST /api/v1/posts/{postId}/reports} and
 * {@code POST /api/v1/comments/{commentId}/reports} — both share the same
 * per-user 10/hour bucket per Spec 3.8 D6. A single bucket prevents an actor
 * from doubling their effective rate by alternating target types.
 *
 * <p>Mirrors {@link com.worshiproom.post.engagement.BookmarksRateLimitConfig}'s
 * shape with a different prefix and different defaults.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.reports")
public class ReportsRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }

    public static class RateLimit {
        private int maxPerHour = 10;
        private int bucketCacheSize = 10_000;
        public int getMaxPerHour() { return maxPerHour; }
        public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
