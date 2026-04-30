package com.worshiproom.legal;

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
 * Per-user legal-accept rate limit. 5 tokens per hour with intervally refill.
 *
 * <p>Bucket map is bounded per the BOUNDED EXTERNAL-INPUT CACHES rule —
 * Caffeine maximumSize(10_000), expireAfterAccess(70 minutes) so the eviction
 * window is slightly longer than the refill window (no risk of evicting a
 * still-active bucket and giving a user free retries).
 *
 * <p>Mirrors {@link com.worshiproom.post.PostsRateLimitService} pattern.
 */
@Service
public class LegalAcceptRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final LegalAcceptRateLimitConfig config;

    public LegalAcceptRateLimitService(LegalAcceptRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getRateLimit().getBucketCacheSize())
                .expireAfterAccess(Duration.ofMinutes(70))
                .build();
    }

    /**
     * Throws {@link LegalAcceptanceRateLimitException} if the user has consumed
     * all tokens in the current 1-hour window. Otherwise consumes one token and
     * returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            throw new LegalAcceptanceRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRateLimit().getMaxPerHour();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
