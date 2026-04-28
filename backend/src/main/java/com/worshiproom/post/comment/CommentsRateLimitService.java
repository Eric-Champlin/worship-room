package com.worshiproom.post.comment;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Per-user comment-write rate limit. 30 tokens per 1h with intervally refill,
 * shared across {@code POST /comments}, {@code PATCH /comments/{id}}, and
 * {@code DELETE /comments/{id}} (per master plan Spec 3.6).
 *
 * <p>Bucket map is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule —
 * Caffeine maximumSize(10_000), expireAfterAccess(2h) so the eviction window
 * is longer than the 1h refill window (no risk of evicting a still-active
 * bucket and giving a user free retries).
 *
 * <p>Single-instance Caffeine; multi-instance deploys need a Redis upgrade
 * (Phase 5.6, same upgrade path as Spec 1's RateLimitFilter and
 * {@link com.worshiproom.post.PostsRateLimitService}).
 */
@Service
public class CommentsRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final CommentsRateLimitConfig config;

    public CommentsRateLimitService(CommentsRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(2))
                .build();
    }

    /**
     * Throws CommentsRateLimitException if the user has consumed all tokens in
     * the current 1-hour window. Otherwise consumes one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new CommentsRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerHour();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
