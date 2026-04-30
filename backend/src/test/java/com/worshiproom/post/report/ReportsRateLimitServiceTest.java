package com.worshiproom.post.report;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 3.8 — unit tests for {@link ReportsRateLimitService}. No Spring context;
 * directly constructs the service with a config to exercise the bucket logic.
 */
class ReportsRateLimitServiceTest {

    private ReportsRateLimitService newServiceWithMax(int max) {
        ReportsRateLimitConfig cfg = new ReportsRateLimitConfig();
        cfg.getRateLimit().setMaxPerHour(max);
        cfg.getRateLimit().setBucketCacheSize(100);
        return new ReportsRateLimitService(cfg);
    }

    private ReportsRateLimitService newServiceWithCacheSize(int max, int cacheSize) {
        ReportsRateLimitConfig cfg = new ReportsRateLimitConfig();
        cfg.getRateLimit().setMaxPerHour(max);
        cfg.getRateLimit().setBucketCacheSize(cacheSize);
        return new ReportsRateLimitService(cfg);
    }

    @Test
    void checkAndConsume_withinLimit_doesNotThrow() {
        ReportsRateLimitService svc = newServiceWithMax(10);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 10; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_overLimit_11thCallThrows() {
        ReportsRateLimitService svc = newServiceWithMax(10);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 10; i++) {
            svc.checkAndConsume(user);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(user))
                .isInstanceOf(ReportsRateLimitException.class)
                .satisfies(ex -> assertThat(((ReportsRateLimitException) ex).getRetryAfterSeconds())
                        .isPositive());
    }

    @Test
    void checkAndConsume_independentBucketsPerUser() {
        ReportsRateLimitService svc = newServiceWithMax(10);
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        for (int i = 0; i < 10; i++) {
            svc.checkAndConsume(userA);
            svc.checkAndConsume(userB);
        }
        // Neither threw — independent buckets.
    }

    @Test
    void bucketCacheSize_isBounded() {
        ReportsRateLimitService svc = newServiceWithCacheSize(10, 2);
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(UUID.randomUUID());
        }
        // Caffeine eviction is asynchronous; cleanUp() forces it.
        svc.getUserBucketsForTesting().cleanUp();
        assertThat(svc.getUserBucketsForTesting().estimatedSize()).isLessThanOrEqualTo(2);
    }
}
