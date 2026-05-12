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
 * Per-(post, user) Prayer Receipt SHARE rate limit (Spec 6.1). Default 5 per
 * post per day, configurable via
 * {@code worshiproom.prayer-receipt.share.rate-limit.*}.
 *
 * <p>Composite key {@link ShareKey} isolates buckets per (post, user) pair.
 * Sharing post A 5 times and post B 5 times produces 10 total successful
 * requests; separate buckets, no cross-talk.
 *
 * <p>Caffeine maximumSize bounded per the BOUNDED EXTERNAL-INPUT CACHES rule;
 * expireAfterAccess(48h) is longer than the 24h refill window so we never
 * evict a still-active bucket and give free retries.
 */
@Service
public class PrayerReceiptShareRateLimitService {

    /** Composite cache key (post, user). UUIDs are immutable so this is a safe record key. */
    public record ShareKey(UUID postId, UUID userId) {}

    private final Cache<ShareKey, Bucket> buckets;
    private final PrayerReceiptShareRateLimitConfig config;

    public PrayerReceiptShareRateLimitService(PrayerReceiptShareRateLimitConfig config) {
        this.config = config;
        this.buckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(48))
                .build();
    }

    /**
     * Throws {@link PrayerReceiptShareRateLimitException} if the user has
     * exceeded the per-post share quota in the current 24-hour window for
     * the given (post, user) pair. Otherwise consumes one token and returns.
     */
    public void checkAndConsume(UUID postId, UUID userId) {
        ShareKey key = new ShareKey(postId, userId);
        Bucket bucket = buckets.get(key, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new PrayerReceiptShareRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerPostPerDay();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(24)));
        return Bucket.builder().addLimit(limit).build();
    }
}
