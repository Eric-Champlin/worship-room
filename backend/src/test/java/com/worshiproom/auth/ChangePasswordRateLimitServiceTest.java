package com.worshiproom.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Plain JUnit5 unit tests for {@link ChangePasswordRateLimitService} (Spec 1.5c
 * Step 3). No Spring context — exercises the bucket directly with default
 * config (5/15min) and asserts capacity + retry-after behavior.
 */
class ChangePasswordRateLimitServiceTest {

    private ChangePasswordRateLimitService service;

    @BeforeEach
    void setUp() {
        ChangePasswordRateLimitConfig config = new ChangePasswordRateLimitConfig();
        // Use defaults: capacity=5, windowMinutes=15, bucketCacheSize=10_000.
        service = new ChangePasswordRateLimitService(config);
    }

    @Test
    void bucketAllowsCapacityConsumesWithinWindow() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            service.checkAndConsume(userId);
        }
        // No exception — first 5 calls succeed.
    }

    @Test
    void bucketRejectsExcessConsumeWithRetryAfterPositive() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            service.checkAndConsume(userId);
        }

        assertThatThrownBy(() -> service.checkAndConsume(userId))
            .isInstanceOf(ChangePasswordRateLimitedException.class)
            .satisfies(ex -> {
                ChangePasswordRateLimitedException rl = (ChangePasswordRateLimitedException) ex;
                assertThat(rl.getRetryAfterSeconds()).isPositive();
                assertThat(rl.getCode()).isEqualTo("CHANGE_PASSWORD_RATE_LIMITED");
                assertThat(rl.getStatus().value()).isEqualTo(429);
            });
    }
}
