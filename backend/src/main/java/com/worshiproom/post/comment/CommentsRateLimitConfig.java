package com.worshiproom.post.comment;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds {@code worshiproom.comments.rate-limit.*},
 * {@code worshiproom.comments.edit-window-minutes}, and
 * {@code worshiproom.comments.idempotency.*} from application.properties.
 *
 * <p>The rate limit applies to {@code POST /api/v1/posts/{id}/comments},
 * {@code PATCH /api/v1/comments/{id}}, and {@code DELETE /api/v1/comments/{id}}
 * (all share the same per-user 30/hour bucket). The edit-window is read by
 * {@code PostCommentService.updateComment}.
 *
 * <p>Mirrors {@link com.worshiproom.post.PostsRateLimitConfig} shape; the unit
 * differs (per-day for posts, per-hour for comments) per master plan.
 */
@Configuration
@ConfigurationProperties(prefix = "worshiproom.comments")
public class CommentsRateLimitConfig {

    private RateLimit rateLimit = new RateLimit();
    private int editWindowMinutes = 5;
    private Idempotency idempotency = new Idempotency();

    public RateLimit getRateLimit() { return rateLimit; }
    public void setRateLimit(RateLimit rateLimit) { this.rateLimit = rateLimit; }
    public int getEditWindowMinutes() { return editWindowMinutes; }
    public void setEditWindowMinutes(int editWindowMinutes) { this.editWindowMinutes = editWindowMinutes; }
    public Idempotency getIdempotency() { return idempotency; }
    public void setIdempotency(Idempotency idempotency) { this.idempotency = idempotency; }

    public static class RateLimit {
        private int maxPerHour = 30;
        private int bucketCacheSize = 10_000;
        public int getMaxPerHour() { return maxPerHour; }
        public void setMaxPerHour(int maxPerHour) { this.maxPerHour = maxPerHour; }
        public int getBucketCacheSize() { return bucketCacheSize; }
        public void setBucketCacheSize(int bucketCacheSize) { this.bucketCacheSize = bucketCacheSize; }
    }

    public static class Idempotency {
        private int cacheSize = 10_000;
        public int getCacheSize() { return cacheSize; }
        public void setCacheSize(int cacheSize) { this.cacheSize = cacheSize; }
    }
}
