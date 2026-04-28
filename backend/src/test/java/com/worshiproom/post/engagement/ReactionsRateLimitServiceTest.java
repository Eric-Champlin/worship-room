package com.worshiproom.post.engagement;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 3.7 — unit tests for {@link ReactionsRateLimitService}. Pure POJO construction;
 * no Spring context. Mirrors the shape of
 * {@code com.worshiproom.post.comment.CommentsRateLimitServiceTest}.
 */
class ReactionsRateLimitServiceTest {

    private ReactionsRateLimitService newServiceWithMax(int max) {
        ReactionsRateLimitConfig cfg = new ReactionsRateLimitConfig();
        cfg.getRateLimit().setMaxPerHour(max);
        cfg.getRateLimit().setBucketCacheSize(100);
        return new ReactionsRateLimitService(cfg);
    }

    @Test
    void checkAndConsume_withinLimit_doesNotThrow() {
        ReactionsRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_atLimit_60thCallStillSucceeds() {
        ReactionsRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 60; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_overLimit_61stCallThrows() {
        ReactionsRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 60; i++) {
            svc.checkAndConsume(user);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(user))
                .isInstanceOf(ReactionsRateLimitException.class)
                .satisfies(ex -> assertThat(((ReactionsRateLimitException) ex).getRetryAfterSeconds())
                        .isPositive());
    }

    @Test
    void checkAndConsume_customMax_appliesPerConfig() {
        ReactionsRateLimitService svc = newServiceWithMax(2);
        UUID user = UUID.randomUUID();
        svc.checkAndConsume(user);
        svc.checkAndConsume(user);
        assertThatThrownBy(() -> svc.checkAndConsume(user))
                .isInstanceOf(ReactionsRateLimitException.class);
    }
}
