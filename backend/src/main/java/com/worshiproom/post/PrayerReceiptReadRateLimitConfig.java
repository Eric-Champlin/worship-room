package com.worshiproom.post;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.prayer-receipt.read.rate-limit.*} from
 * application.properties (Spec 6.1).
 *
 * <p>Mirrors the {@code @ConfigurationProperties} shape of
 * {@link com.worshiproom.post.engagement.ReactionsRateLimitConfig} —
 * 60/hour/user default matches the existing engagement-write limit for
 * consistency. The read endpoint is author-only (controller-enforced
 * 403), so this limit primarily catches runaway-client polling, not
 * abuse.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.prayer-receipt.read")
public class PrayerReceiptReadRateLimitConfig {

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
