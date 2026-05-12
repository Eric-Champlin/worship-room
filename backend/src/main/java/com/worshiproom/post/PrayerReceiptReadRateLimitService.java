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
 * Per-user Prayer Receipt READ rate limit (Spec 6.1). 60 tokens per 1h
 * (default; configurable via {@code worshiproom.prayer-receipt.read.rate-limit.*}).
 *
 * <p>Matches the bucket4j+Caffeine shape of
 * {@link com.worshiproom.post.engagement.ReactionsRateLimitService} —
 * Caffeine maximumSize bounded per the BOUNDED EXTERNAL-INPUT CACHES rule;
 * expireAfterAccess(2h) is longer than the 1h refill window so we never evict
 * an active bucket and give a user free retries.
 *
 * <p>Single-instance Caffeine; multi-instance deploys upgrade to Redis via
 * Phase 5.6 (NOT consumed by this service — strangler preserved per W13 /
 * D-RateLimit-pattern).
 */
@Service
public class PrayerReceiptReadRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final PrayerReceiptReadRateLimitConfig config;

    public PrayerReceiptReadRateLimitService(PrayerReceiptReadRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(2))
                .build();
    }

    /**
     * Throws {@link PrayerReceiptReadRateLimitException} if the user has
     * consumed all tokens in the current 1-hour window. Otherwise consumes
     * one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new PrayerReceiptReadRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerHour();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
