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
 * Spec 6.5 — per-user Intercessor Timeline READ rate limit. 60 tokens per
 * 1 minute (default; configurable via {@code worshiproom.intercessor.read.*}).
 *
 * <p>Mirrors the bucket4j+Caffeine shape of
 * {@link PrayerReceiptReadRateLimitService} — Caffeine maximumSize bounded
 * per the BOUNDED EXTERNAL-INPUT CACHES rule; expireAfterAccess(2h) is
 * longer than the 1-minute refill window so we never evict an active bucket
 * and give a user free retries.
 *
 * <p>Single-instance Caffeine; multi-instance deploys upgrade to Redis via
 * Phase 5.6 (not consumed here).
 */
@Service
public class IntercessorReadRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final IntercessorReadRateLimitConfig config;

    public IntercessorReadRateLimitService(IntercessorReadRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(2))
                .build();
    }

    /**
     * Throws {@link IntercessorReadRateLimitException} if the user has
     * consumed all tokens in the current 1-minute window. Otherwise consumes
     * one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new IntercessorReadRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerMinute();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
