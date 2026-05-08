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
 * Per-user resolve-question rate limit (Spec 4.4 D6). 30 tokens per hour with
 * intervally refill. Sibling pattern to {@link PostsRateLimitService} —
 * different cadence (per-hour vs. per-day) so a clean-room service avoids
 * forcing the existing class to take a duration parameter.
 *
 * <p>Bucket map is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule —
 * Caffeine maximumSize(10_000), expireAfterAccess(2h) so the eviction window
 * is slightly longer than the refill window.
 *
 * <p>Throws {@link PostsRateLimitException} on exhaustion so the existing
 * {@link PostExceptionHandler#handleRateLimit} method emits the correct
 * {@code Retry-After} header without code duplication.
 */
@Service
public class ResolveRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final PostsRateLimitConfig config;

    public ResolveRateLimitService(PostsRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getResolve().getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofHours(2))
                .build();
    }

    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L,
                TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new PostsRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getResolve().getRateLimit().getMaxPerHour();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
