package com.worshiproom.post;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 6.1 — unit tests for {@link PrayerReceiptShareRateLimitService}.
 * Verifies the per-(post, user) composite-key behavior — different posts
 * have independent buckets.
 */
class PrayerReceiptShareRateLimitServiceTest {

    private PrayerReceiptShareRateLimitService newServiceWithMax(int max) {
        PrayerReceiptShareRateLimitConfig cfg = new PrayerReceiptShareRateLimitConfig();
        cfg.getRateLimit().setMaxPerPostPerDay(max);
        cfg.getRateLimit().setBucketCacheSize(100);
        return new PrayerReceiptShareRateLimitService(cfg);
    }

    @Test
    void checkAndConsume_5SharesSucceed_6thThrows() {
        PrayerReceiptShareRateLimitService svc = newServiceWithMax(5);
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(postId, userId);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(postId, userId))
                .isInstanceOf(PrayerReceiptShareRateLimitException.class)
                .satisfies(ex -> assertThat(((PrayerReceiptShareRateLimitException) ex).getRetryAfterSeconds())
                        .isPositive());
    }

    @Test
    void checkAndConsume_differentPostsHaveIndependentBuckets() {
        PrayerReceiptShareRateLimitService svc = newServiceWithMax(5);
        UUID postA = UUID.randomUUID();
        UUID postB = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(postA, userId);
        }
        // postA exhausted; postB still available
        assertThatThrownBy(() -> svc.checkAndConsume(postA, userId))
                .isInstanceOf(PrayerReceiptShareRateLimitException.class);
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(postB, userId);
        }
    }

    @Test
    void checkAndConsume_differentUsersHaveIndependentBuckets() {
        PrayerReceiptShareRateLimitService svc = newServiceWithMax(5);
        UUID postId = UUID.randomUUID();
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(postId, userA);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(postId, userA))
                .isInstanceOf(PrayerReceiptShareRateLimitException.class);
        // userB hasn't shared yet; their bucket is fresh
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(postId, userB);
        }
    }

    @Test
    void shareKey_equalsAndHashCodeWorkAsRecordKey() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        var k1 = new PrayerReceiptShareRateLimitService.ShareKey(postId, userId);
        var k2 = new PrayerReceiptShareRateLimitService.ShareKey(postId, userId);
        assertThat(k1).isEqualTo(k2);
        assertThat(k1.hashCode()).isEqualTo(k2.hashCode());
    }
}
