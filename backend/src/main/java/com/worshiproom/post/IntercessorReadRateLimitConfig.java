package com.worshiproom.post;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Spec 6.5 — binds {@code worshiproom.intercessor.read.rate-limit.*} from
 * application.properties.
 *
 * <p>Default: 60 tokens per 1 minute per user (MPD-10). Faster window than
 * 6.1's 60/hour because the endpoint is invoked on every tap-to-expand —
 * a user browsing many posts will rack up requests legitimately.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.intercessor.read")
public class IntercessorReadRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }

    public static class RateLimit {
        private int maxPerMinute = 60;
        private int bucketCacheSize = 10_000;
        public int getMaxPerMinute() { return maxPerMinute; }
        public void setMaxPerMinute(int maxPerMinute) { this.maxPerMinute = maxPerMinute; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
