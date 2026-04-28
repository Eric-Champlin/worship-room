package com.worshiproom.post.engagement;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 3.7 — unit tests for {@link BookmarksRateLimitService}. Mirrors the shape of
 * {@link ReactionsRateLimitServiceTest} with the bookmark-specific exception class.
 */
class BookmarksRateLimitServiceTest {

    private BookmarksRateLimitService newServiceWithMax(int max) {
        BookmarksRateLimitConfig cfg = new BookmarksRateLimitConfig();
        cfg.getRateLimit().setMaxPerHour(max);
        cfg.getRateLimit().setBucketCacheSize(100);
        return new BookmarksRateLimitService(cfg);
    }

    @Test
    void checkAndConsume_withinLimit_doesNotThrow() {
        BookmarksRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_atLimit_60thCallStillSucceeds() {
        BookmarksRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 60; i++) {
            svc.checkAndConsume(user);
        }
    }

    @Test
    void checkAndConsume_overLimit_61stCallThrows() {
        BookmarksRateLimitService svc = newServiceWithMax(60);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 60; i++) {
            svc.checkAndConsume(user);
        }
        assertThatThrownBy(() -> svc.checkAndConsume(user))
                .isInstanceOf(BookmarksRateLimitException.class)
                .satisfies(ex -> assertThat(((BookmarksRateLimitException) ex).getRetryAfterSeconds())
                        .isPositive());
    }
}
