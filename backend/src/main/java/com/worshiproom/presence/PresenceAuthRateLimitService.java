package com.worshiproom.presence;

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
 * Spec 6.11b — per-user 120/min rate limit on
 * {@code GET /api/v1/prayer-wall/presence} for authenticated callers.
 * Mirrors {@link com.worshiproom.verse.VerseFindsYouRateLimitService}.
 *
 * <p>Caffeine-bounded bucket map (max 10K entries, TTL 5 min — slightly longer
 * than the rate window). Per Phase 3 Addendum item 5 / 02-security.md
 * § "BOUNDED EXTERNAL-INPUT CACHES".
 */
@Service
public class PresenceAuthRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final PresenceAuthRateLimitConfig config;

    public PresenceAuthRateLimitService(PresenceAuthRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getBucketMapMaxSize())
                .expireAfterAccess(Duration.ofMinutes(config.getBucketMapTtlMinutes()))
                .build();
    }

    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L,
                TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new PresenceRateLimitException(retryAfterSec, "auth");
        }
    }

    private Bucket newBucket() {
        int max = config.getRequestsPerMinute();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    /** Test hook: clear all buckets (test-only use; never called in production code). */
    public void resetForTesting() {
        userBuckets.invalidateAll();
    }
}
