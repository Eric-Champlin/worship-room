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
 * Per-user rate limit on {@code /api/v1/sessions/*} (Spec 1.5g). 10 tokens
 * per 60-min refill window per userId by default; configurable via
 * {@code auth.rate-limit.sessions.*}.
 *
 * <p>Mirrors {@link ChangePasswordRateLimitService} verbatim — same Caffeine
 * bounded-cache pattern, same per-user bucket map, same 429 + Retry-After
 * surfacing via {@link SessionRateLimitedException}.
 *
 * <p>Bucket map bounded to 10K entries with 90-min eviction (strictly longer
 * than the 60-min refill window per BOUNDED EXTERNAL-INPUT CACHES rule
 * in {@code 02-security.md}).
 */
@Service
public class SessionRateLimitService {

    private static final Logger log = LoggerFactory.getLogger(SessionRateLimitService.class);

    private final Cache<UUID, Bucket> userBuckets;
    private final SessionRateLimitConfig config;

    public SessionRateLimitService(SessionRateLimitConfig config) {
        this.config = config;
        this.userBuckets = Caffeine.newBuilder()
                .maximumSize(config.getBucketCacheSize())
                .expireAfterAccess(Duration.ofMinutes(90))
                .build();
    }

    /**
     * Throws {@link SessionRateLimitedException} if the user has consumed all
     * tokens in the current window. Otherwise consumes one token and returns.
     */
    public void checkAndConsume(UUID userId) {
        Bucket bucket = userBuckets.get(userId, k -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1L,
                TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.info("sessionRateLimited userId={} retryAfterSec={}", userId, retryAfterSec);
            throw AuthException.sessionRateLimited(retryAfterSec);
        }
    }

    private Bucket newBucket() {
        int max = config.getCapacity();
        Bandwidth limit = Bandwidth.classic(max,
            Refill.intervally(max, Duration.ofMinutes(config.getWindowMinutes())));
        return Bucket.builder().addLimit(limit).build();
    }
}
