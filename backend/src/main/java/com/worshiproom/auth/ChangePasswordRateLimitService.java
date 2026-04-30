package com.worshiproom.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Per-user change-password rate limit (Spec 1.5c MPD-3 + D5). 5 tokens per 15-min
 * refill window per userId, enforced at the service layer (NOT the filter layer)
 * because the principal's userId is only available after JWT authentication.
 *
 * <p>Bucket map is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule —
 * Caffeine maximumSize(10_000), expireAfterAccess(30 min) so the eviction window
 * is strictly LONGER than the 15-min refill window (Spec 1.5c Watch-For #6:
 * eviction shorter than refill would let an attacker evict + get a fresh bucket).
 *
 * <p>Single-instance Caffeine; multi-instance deploys need a Redis upgrade
 * (Phase 5.6, same upgrade path as Spec 1's RateLimitFilter and the
 * post-engagement rate-limit services).
 */
@Service
public class ChangePasswordRateLimitService {

    private static final Logger log = LoggerFactory.getLogger(ChangePasswordRateLimitService.class);

    private final Cache<UUID, Bucket> userBuckets;
    private final ChangePasswordRateLimitConfig config;

    public ChangePasswordRateLimitService(ChangePasswordRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getBucketCacheSize())
                .expireAfterAccess(Duration.ofMinutes(30))
                .build();
    }

    /**
     * Throws {@link ChangePasswordRateLimitedException} if the user has consumed
     * all tokens in the current refill window. Otherwise consumes one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.info("changePasswordRateLimited userId={} retryAfterSec={}", userId, retryAfterSec);
            throw AuthException.changePasswordRateLimited(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getCapacity();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofMinutes(config.getWindowMinutes())));
        return Bucket.builder().addLimit(limit).build();
    }
}
