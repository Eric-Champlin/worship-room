package com.worshiproom.post;

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
 * Per-user posts-per-day rate limit. 5 tokens per 24h with intervally refill
 * (matches "5 posts per day" mental model in the master plan).
 *
 * <p>Bucket map is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule —
 * Caffeine maximumSize(10_000), expireAfterAccess(25h) so the eviction window
 * is slightly longer than the refill window (no risk of evicting a still-active
 * bucket and giving a user free retries).
 *
 * <p>Single-instance Caffeine; multi-instance deploys need a Redis upgrade
 * (Phase 5.6, same upgrade path as Spec 1's RateLimitFilter).
 */
@Service
public class PostsRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final PostsRateLimitConfig config;

    public PostsRateLimitService(PostsRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(25))
                .build();
    }

    /**
     * Throws PostsRateLimitException if the user has consumed all tokens in
     * the current 24-hour window. Otherwise consumes one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new PostsRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerDay();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(24)));
        return Bucket.builder().addLimit(limit).build();
    }
}
