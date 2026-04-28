package com.worshiproom.post.comment;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentsRateLimitServiceTest {

    private CommentsRateLimitConfig defaultConfig() {
        return new CommentsRateLimitConfig();  // 30/hour, 10_000 cache size
    }

    private CommentsRateLimitConfig customConfig(int maxPerHour) {
        CommentsRateLimitConfig cfg = new CommentsRateLimitConfig();
        cfg.getRateLimit().setMaxPerHour(maxPerHour);
        return cfg;
    }

    @Test
    void allowsUpToMaxPerHour() {
        CommentsRateLimitService service = new CommentsRateLimitService(defaultConfig());
        UUID userA = UUID.randomUUID();

        // 30 successive calls should succeed.
        for (int i = 0; i < 30; i++) {
            service.checkAndConsume(userA);
        }
    }

    @Test
    void thirtyFirstCallThrows() {
        CommentsRateLimitService service = new CommentsRateLimitService(defaultConfig());
        UUID userA = UUID.randomUUID();

        for (int i = 0; i < 30; i++) {
            service.checkAndConsume(userA);
        }

        assertThatThrownBy(() -> service.checkAndConsume(userA))
                .isInstanceOf(CommentsRateLimitException.class)
                .satisfies(ex -> {
                    CommentsRateLimitException e = (CommentsRateLimitException) ex;
                    assertThat(e.getRetryAfterSeconds()).isPositive();
                });
    }

    @Test
    void differentUsersIsolated() {
        CommentsRateLimitService service = new CommentsRateLimitService(defaultConfig());
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        for (int i = 0; i < 30; i++) {
            service.checkAndConsume(userA);
        }
        // userA exhausted; userB still has full allowance.
        for (int i = 0; i < 30; i++) {
            service.checkAndConsume(userB);
        }
    }

    @Test
    void customMaxRespected() {
        CommentsRateLimitService service = new CommentsRateLimitService(customConfig(5));
        UUID userA = UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            service.checkAndConsume(userA);
        }
        assertThatThrownBy(() -> service.checkAndConsume(userA))
                .isInstanceOf(CommentsRateLimitException.class);
    }

    @Test
    void retryAfterIsPositiveAndBounded() {
        CommentsRateLimitService service = new CommentsRateLimitService(defaultConfig());
        UUID userA = UUID.randomUUID();

        for (int i = 0; i < 30; i++) {
            service.checkAndConsume(userA);
        }

        try {
            service.checkAndConsume(userA);
        } catch (CommentsRateLimitException e) {
            assertThat(e.getRetryAfterSeconds()).isPositive();
            // The bucket refills over a 1-hour window, so retry-after is at most 3600s.
            assertThat(e.getRetryAfterSeconds()).isLessThanOrEqualTo(3600);
        }
    }
}
