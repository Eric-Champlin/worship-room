package com.worshiproom.presence;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Spec 6.11b — per-IP 60/min rate limit on
 * {@code GET /api/v1/prayer-wall/presence} for anonymous callers.
 * Mirrors {@link PresenceAuthRateLimitService} with {@link String} (IP) keying
 * instead of {@link java.util.UUID}.
 *
 * <p>Anonymous limit per master plan body (NOT 120/min/cookie-session as the
 * brief suggested — master plan wins on conflict per
 * {@code 03-backend-standards.md} § Authority hierarchy). IP resolved via
 * {@link com.worshiproom.proxy.common.IpResolver}, which respects the
 * {@code proxy.trust-forwarded-headers} flag (false in dev, true in prod).
 */
@Service
public class PresenceAnonRateLimitService {

    private final Cache<String, Bucket> ipBuckets;
    private final PresenceAnonRateLimitConfig config;

    public PresenceAnonRateLimitService(PresenceAnonRateLimitConfig config) {
        this.config = config;
        this.ipBuckets = Caffeine.newBuilder()
                .maximumSize(config.getBucketMapMaxSize())
                .expireAfterAccess(Duration.ofMinutes(config.getBucketMapTtlMinutes()))
                .build();
    }

    public void checkAndConsume(String ip) {
        Bucket bucket = ipBuckets.get(ip, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L,
                TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new PresenceRateLimitException(retryAfterSec, "anon");
        }
    }

    private Bucket newBucket() {
        int max = config.getRequestsPerMinute();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    /** Test hook: clear all buckets (test-only use; never called in production code). */
    public void resetForTesting() {
        ipBuckets.invalidateAll();
    }
}
