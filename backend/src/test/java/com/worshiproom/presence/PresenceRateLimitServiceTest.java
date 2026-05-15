package com.worshiproom.presence;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 6.11b — unit tests for the per-user and per-IP rate-limit services.
 * No Spring context — direct construction with config beans.
 */
class PresenceRateLimitServiceTest {

    @Test
    void authBucketAllowsUpToConfiguredLimit() {
        PresenceAuthRateLimitConfig config = new PresenceAuthRateLimitConfig();
        config.setRequestsPerMinute(5);
        PresenceAuthRateLimitService service = new PresenceAuthRateLimitService(config);
        UUID userId = UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            service.checkAndConsume(userId);
        }

        assertThatThrownBy(() -> service.checkAndConsume(userId))
            .isInstanceOf(PresenceRateLimitException.class)
            .satisfies(ex -> {
                PresenceRateLimitException prle = (PresenceRateLimitException) ex;
                assertThat(prle.getBucket()).isEqualTo("auth");
                assertThat(prle.getRetryAfterSeconds()).isPositive();
            });
    }

    @Test
    void anonBucketAllowsUpToConfiguredLimit() {
        PresenceAnonRateLimitConfig config = new PresenceAnonRateLimitConfig();
        config.setRequestsPerMinute(5);
        PresenceAnonRateLimitService service = new PresenceAnonRateLimitService(config);
        String ip = "1.2.3.4";

        for (int i = 0; i < 5; i++) {
            service.checkAndConsume(ip);
        }

        assertThatThrownBy(() -> service.checkAndConsume(ip))
            .isInstanceOf(PresenceRateLimitException.class)
            .satisfies(ex -> {
                PresenceRateLimitException prle = (PresenceRateLimitException) ex;
                assertThat(prle.getBucket()).isEqualTo("anon");
            });
    }

    @Test
    void anonBucketsAreIsolatedPerIp() {
        PresenceAnonRateLimitConfig config = new PresenceAnonRateLimitConfig();
        config.setRequestsPerMinute(3);
        PresenceAnonRateLimitService service = new PresenceAnonRateLimitService(config);

        for (int i = 0; i < 3; i++) {
            service.checkAndConsume("1.1.1.1");
        }
        // 1.1.1.1 exhausted
        assertThatThrownBy(() -> service.checkAndConsume("1.1.1.1"))
            .isInstanceOf(PresenceRateLimitException.class);

        // 2.2.2.2 still has full budget
        for (int i = 0; i < 3; i++) {
            service.checkAndConsume("2.2.2.2");
        }
    }

    @Test
    void authBucketsAreIsolatedPerUser() {
        PresenceAuthRateLimitConfig config = new PresenceAuthRateLimitConfig();
        config.setRequestsPerMinute(2);
        PresenceAuthRateLimitService service = new PresenceAuthRateLimitService(config);

        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();

        service.checkAndConsume(a);
        service.checkAndConsume(a);
        assertThatThrownBy(() -> service.checkAndConsume(a))
            .isInstanceOf(PresenceRateLimitException.class);

        // User b unaffected
        service.checkAndConsume(b);
        service.checkAndConsume(b);
    }
}
