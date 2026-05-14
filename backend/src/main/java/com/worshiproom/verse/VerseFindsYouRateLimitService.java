package com.worshiproom.verse;

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
 * Per-user 10-requests-per-hour rate limit on {@code GET /api/v1/verse-finds-you}
 * (Spec 6.8 §"Rate limits"). Mirrors {@link com.worshiproom.post.PostsRateLimitService}.
 *
 * <p>Caffeine-bounded bucket map with TTL eviction slightly longer than the rate
 * window so a still-active bucket can't be evicted and re-issued.
 */
@Service
public class VerseFindsYouRateLimitService {

    private final Cache<UUID, Bucket> userBuckets;
    private final VerseFindsYouRateLimitConfig config;

    public VerseFindsYouRateLimitService(VerseFindsYouRateLimitConfig config) {
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
            throw new VerseFindsYouRateLimitException(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRequestsPerHour();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
