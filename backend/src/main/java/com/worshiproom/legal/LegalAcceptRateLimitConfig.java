package com.worshiproom.legal;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.legal.accept.rate-limit.*} from application.properties.
 * Mirrors {@link com.worshiproom.post.PostsRateLimitConfig} structure.
 *
 * <p>Applied to {@code POST /api/v1/users/me/legal/accept} via
 * {@link LegalAcceptRateLimitService}.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.legal.accept")
public class LegalAcceptRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }

    public static class RateLimit {
        private int maxPerHour = 5;
        private int bucketCacheSize = 10_000;

        public int getMaxPerHour() { return maxPerHour; }
        public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
