package com.worshiproom.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * bucket4j + Caffeine in-memory implementation (Spec 5.6 / D1 / MPD-1).
 *
 * <p>Bucket state held in a Caffeine-bounded map (maximumSize 10,000,
 * expireAfterAccess 1 hour). Same pattern as the existing 11 per-service rate limiters
 * (see {@code PostsRateLimitService}) so contract-test behavioral parity with
 * {@link RedisRateLimiter} is achievable.
 *
 * <p>This impl is NOT extracted from any one of the existing per-service classes —
 * the design intent (MPD-1) is parity with the pattern, not literal extraction.
 */
public class InMemoryRateLimiter implements RateLimiter {

    private final Cache<String, Bucket> buckets;

    public InMemoryRateLimiter(int bucketCacheSize) {
        this.buckets = Caffeine.newBuilder()
            .maximumSize(bucketCacheSize)
            .expireAfterAccess(Duration.ofHours(1))
            .build();
    }

    @Override
    public RateLimitResult tryConsume(String bucketKey, BucketConfiguration config) {
        Bucket bucket = buckets.get(bucketKey, k -> Bucket.builder()
            .addLimit(config.getBandwidths()[0])
            .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return new RateLimitResult(true, probe.getRemainingTokens(), Duration.ZERO);
        }
        long retryNanos = probe.getNanosToWaitForRefill();
        return new RateLimitResult(false, probe.getRemainingTokens(),
            Duration.ofNanos(Math.max(retryNanos, TimeUnit.SECONDS.toNanos(1))));
    }
}
