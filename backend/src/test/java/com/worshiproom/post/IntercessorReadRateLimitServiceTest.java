package com.worshiproom.post;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 6.5 — unit tests for {@link IntercessorReadRateLimitService}.
 * Pure POJO construction; no Spring context. Mirrors the shape of
 * {@link PrayerReceiptReadRateLimitServiceTest}.
 */
class IntercessorReadRateLimitServiceTest {

    private IntercessorReadRateLimitService newServiceWithMax(int max) {
        IntercessorReadRateLimitConfig cfg = new IntercessorReadRateLimitConfig();
        cfg.getRateLimit().setMaxPerMinute(max);
        cfg.getRateLimit().setBucketCacheSize(100);
        return new IntercessorReadRateLimitService(cfg);
    }

    @Test
    void checkAndConsume_withinLimit_doesNotThrow() {
        IntercessorReadRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 10; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_overLimit_throwsWithPositiveRetryAfter() {
        IntercessorReadRateLimitService svc = newServiceWithMax(5);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(user);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(user))
                .isInstanceOf(IntercessorReadRateLimitException.class)
                .satisfies(ex -> assertThat(((IntercessorReadRateLimitException) ex).getRetryAfterSeconds())
                        .isPositive());
    }

    @Test
    void checkAndConsume_perUserIsolation_oneUserExhaustingDoesNotAffectAnother() {
        IntercessorReadRateLimitService svc = newServiceWithMax(2);
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        svc.checkAndConsume(userA);
        svc.checkAndConsume(userA);
        assertThatThrownBy(() -> svc.checkAndConsume(userA))
                .isInstanceOf(IntercessorReadRateLimitException.class);
        // userB has its own bucket — unaffected by userA exhaustion
        svc.checkAndConsume(userB);
        svc.checkAndConsume(userB);
    }
}
