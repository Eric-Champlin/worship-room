package com.worshiproom.post;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 6.1 — unit tests for {@link PrayerReceiptReadRateLimitService}.
 * Pure POJO construction; no Spring context. Mirrors the shape of
 * {@code ReactionsRateLimitServiceTest}.
 */
class PrayerReceiptReadRateLimitServiceTest {

    private PrayerReceiptReadRateLimitService newServiceWithMax(int max) {
        PrayerReceiptReadRateLimitConfig cfg = new PrayerReceiptReadRateLimitConfig();
        cfg.getRateLimit().setMaxPerHour(max);
        cfg.getRateLimit().setBucketCacheSize(100);
        return new PrayerReceiptReadRateLimitService(cfg);
    }

    @Test
    void checkAndConsume_withinLimit_doesNotThrow() {
        PrayerReceiptReadRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 10; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_atLimit_60thCallStillSucceeds() {
        PrayerReceiptReadRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 60; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_overLimit_61stCallThrowsWithPositiveRetryAfter() {
        PrayerReceiptReadRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 60; i++) {
            svc.checkAndConsume(user);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(user))
                .isInstanceOf(PrayerReceiptReadRateLimitException.class)
                .satisfies(ex -> assertThat(((PrayerReceiptReadRateLimitException) ex).getRetryAfterSeconds())
                        .isPositive());
    }

    @Test
    void checkAndConsume_perUserIsolation_oneUserExhaustingDoesNotAffectAnother() {
        PrayerReceiptReadRateLimitService svc = newServiceWithMax(2);
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        svc.checkAndConsume(userA);
        svc.checkAndConsume(userA);
        assertThatThrownBy(() -> svc.checkAndConsume(userA))
                .isInstanceOf(PrayerReceiptReadRateLimitException.class);
        // userB has its own bucket — unaffected by userA exhaustion
        svc.checkAndConsume(userB);
        svc.checkAndConsume(userB);
    }
}
