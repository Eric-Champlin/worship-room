package com.worshiproom.quicklift;

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
 * Per-user Quick Lift start rate limit (Spec 6.2). Default prod: 10 tokens per
 * 1-min refill window per userId. Enforced at the service layer (NOT filter
 * layer) because the principal's userId is only available after JWT auth.
 *
 * <p>Bucket map is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule —
 * Caffeine maximumSize from config (10_000), expireAfterAccess(5 min) so the
 * eviction window is strictly LONGER than the 1-min refill window (Spec 1.5c
 * Watch-For #6: eviction shorter than refill would let an attacker evict +
 * get a fresh bucket).
 *
 * <p>Single-instance Caffeine; multi-instance deploys need a Redis upgrade
 * (Phase 5.6, same upgrade path as the auth rate-limit services).
 */
@Service
public class QuickLiftStartRateLimitService {

    private static final Logger log = LoggerFactory.getLogger(QuickLiftStartRateLimitService.class);

    private final Cache<UUID, Bucket> userBuckets;
    private final QuickLiftStartRateLimitConfig config;

    public QuickLiftStartRateLimitService(QuickLiftStartRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getBucketCacheSize())
                .expireAfterAccess(Duration.ofMinutes(5))
                .build();
    }

    /**
     * Throws {@link QuickLiftStartRateLimitedException} if the user has consumed
     * all tokens in the current 1-min refill window. Otherwise consumes one
     * token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.info("quickLiftStartRateLimited userId={} retryAfterSec={}", userId, retryAfterSec);
            throw QuickLiftException.startRateLimited(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRequestsPerMinute();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
