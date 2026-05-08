package com.worshiproom.post;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.posts.rate-limit.*} and
 * {@code worshiproom.posts.edit-window-minutes} from application.properties.
 *
 * <p>The rate limit applies to {@code POST /api/v1/posts} only; edit-window is
 * read by {@code PostService.updatePost} for non-exempt edits.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.posts")
public class PostsRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();
    private int editWindowMinutes = 5;
    private Idempotency idempotency = new Idempotency();
    private Resolve resolve = new Resolve();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }
    public int getEditWindowMinutes() { return editWindowMinutes; }
    public void setEditWindowMinutes(int editWindowMinutes) { this.editWindowMinutes = editWindowMinutes; }
    public Idempotency getIdempotency() { return idempotency; }
    public void setIdempotency(Idempotency idempotency) { this.idempotency = idempotency; }
    public Resolve getResolve() { return resolve; }
    public void setResolve(Resolve resolve) { this.resolve = resolve; }

    public static class RateLimit {
        private int maxPerDay = 5;
        private int bucketCacheSize = 10_000;
        public int getMaxPerDay() { return maxPerDay; }
        public void setMaxPerDay(int maxPerDay) { this.maxPerDay = maxPerDay; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }

    public static class Idempotency {
        private int cacheSize = 10_000;
        public int getCacheSize() { return cacheSize; }
        public void setCacheSize(int cacheSize) { this.cacheSize = cacheSize; }
    }

    /** Spec 4.4 — PATCH /api/v1/posts/{id}/resolve per-user rate limit (30/hour). */
    public static class Resolve {
        private ResolveRateLimit rateLimit = new ResolveRateLimit();
        public ResolveRateLimit getRateLimit() { return rateLimit; }
        public void setRateLimit(ResolveRateLimit rateLimit) { this.rateLimit = rateLimit; }
    }

    public static class ResolveRateLimit {
        private int maxPerHour = 30;
        private int bucketCacheSize = 10_000;
        public int getMaxPerHour() { return maxPerHour; }
        public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }
}
