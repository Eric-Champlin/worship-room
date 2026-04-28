package com.worshiproom.post.engagement;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.reactions.rate-limit.*} from application.properties.
 *
 * <p>The rate limit applies to {@code POST /api/v1/posts/{id}/reactions} and
 * {@code DELETE /api/v1/posts/{id}/reactions} — both share the same per-user
 * 60/hour bucket per Spec 3.7 D8.
 *
 * <p>Mirrors the rate-limit subset of
 * {@link com.worshiproom.post.comment.CommentsRateLimitConfig}; reactions
 * have no edit window and no idempotency cache (composite-key DB constraint
 * provides natural idempotency per Spec 3.7 D5).
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.reactions")
public class ReactionsRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }

    public static class RateLimit {
        private int maxPerHour = 60;
        private int bucketCacheSize = 10_000;
        public int getMaxPerHour() { return maxPerHour; }
        public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
