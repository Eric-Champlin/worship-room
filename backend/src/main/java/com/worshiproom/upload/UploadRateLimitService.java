package com.worshiproom.upload;

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
 * Per-user image-uploads-per-hour rate limit (Spec 4.6b). 10 tokens per 1h with
 * intervally refill — matches the spec's "10 uploads per hour per user" cap.
 *
 * <p>Bucket map bounded per the BOUNDED EXTERNAL-INPUT CACHES rule (02-security.md):
 * Caffeine {@code maximumSize(10_000)} + {@code expireAfterAccess(2h)}. The 2h
 * eviction window is strictly longer than the 1h refill window so an active
 * bucket can never be evicted prematurely (which would give a user free retries).
 *
 * <p>Mirrors the shape of {@link com.worshiproom.post.PostsRateLimitService},
 * with per-hour bucket math instead of per-day.
 *
 * <p>Single-instance Caffeine; multi-instance deploys need a Redis upgrade
 * (same upgrade path as Spec 1's RateLimitFilter).
 */
@Service
public class UploadRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final UploadProperties config;

    public UploadRateLimitService(UploadProperties config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(2))
                .build();
    }

    /**
     * Throws UploadRateLimitException if the user has consumed all tokens in
     * the current 1-hour window. Otherwise consumes one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new UploadRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerHour();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
