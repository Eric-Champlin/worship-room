package com.worshiproom.post;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.prayer-receipt.share.rate-limit.*} from
 * application.properties (Spec 6.1).
 *
 * <p>Per the spec, the SHARE endpoint is rate-limited per-(post, user)/day:
 * 5 shares of the SAME post by the SAME author per day. Multiple posts each
 * have their own buckets. Default cache size is 10k (post, user) pairs in
 * memory — bucket cache is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.prayer-receipt.share")
public class PrayerReceiptShareRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }

    public static class RateLimit {
        private int maxPerPostPerDay = 5;
        private int bucketCacheSize = 10_000;
        public int getMaxPerPostPerDay() { return maxPerPostPerDay; }
        public void setMaxPerPostPerDay(int maxPerPostPerDay) { this.maxPerPostPerDay = maxPerPostPerDay; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
