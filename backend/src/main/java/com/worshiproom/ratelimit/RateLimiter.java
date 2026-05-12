package com.worshiproom.ratelimit;

import io.github.bucket4j.BucketConfiguration;

/**
 * Profile-agnostic rate limiter contract (Spec 5.6 / D9).
 *
 * <p>Two implementations:
 * <ul>
 *   <li>{@link InMemoryRateLimiter} — bucket4j + Caffeine; single-instance state.</li>
 *   <li>{@link RedisRateLimiter} — bucket4j-lettuce; cross-instance state.</li>
 * </ul>
 *
 * <p>Bean selection by {@link RateLimiterConfig} per Spring profile + the
 * {@code worshiproom.ratelimit.backend} property.
 *
 * <p>Existing per-service rate limiters (11 files; see Spec 5.6 W3 / D1) are NOT migrated
 * in 5.6. The first consumer of this interface is expected to be Phase 6.1 Prayer Receipt's
 * {@code GET /api/v1/posts/{id}/prayer-receipt} endpoint.
 */
public interface RateLimiter {

    /**
     * Attempts to consume one token from the bucket identified by {@code bucketKey}.
     * Consumers compute the key (via {@code IpResolver} or their own logic) before calling.
     *
     * @param bucketKey opaque string identifier for the bucket (typically
     *                  {@code rate:{endpoint-category}:{authed|anon}:{user-id-or-ip-hash}:{window-start-epoch}})
     * @param config    bucket configuration (capacity + refill); the underlying impl creates
     *                  the bucket on first use and reuses it on subsequent calls for the same key
     * @return outcome (allowed, remaining, retryAfter)
     */
    RateLimitResult tryConsume(String bucketKey, BucketConfiguration config);
}
