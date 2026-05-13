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
 * Per-user Quick Lift complete rate limit (Spec 6.2 — defense-in-depth).
 * Default prod: 30 tokens per 1-min refill window per userId.
 *
 * <p>Sibling to {@link QuickLiftStartRateLimitService}; same Caffeine bounding
 * and eviction-window-strictly-longer-than-refill discipline.
 */
@Service
public class QuickLiftCompleteRateLimitService {

    private static final Logger log = LoggerFactory.getLogger(QuickLiftCompleteRateLimitService.class);

    private final Cache<UUID, Bucket> userBuckets;
    private final QuickLiftCompleteRateLimitConfig config;

    public QuickLiftCompleteRateLimitService(QuickLiftCompleteRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getBucketCacheSize())
                .expireAfterAccess(Duration.ofMinutes(5))
                .build();
    }

    /**
     * Throws {@link QuickLiftCompleteRateLimitedException} if the user has
     * consumed all tokens in the current 1-min refill window. Otherwise
     * consumes one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.info("quickLiftCompleteRateLimited userId={} retryAfterSec={}", userId, retryAfterSec);
            throw QuickLiftException.completeRateLimited(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getRequestsPerMinute();
        Bandwidth limit = Bandwidth.classic(max, Refill.intervally(max, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
