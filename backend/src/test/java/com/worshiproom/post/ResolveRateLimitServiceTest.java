package com.worshiproom.post;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link ResolveRateLimitService} (Spec 4.4 D6). Default cadence
 * is 30 tokens/hour per user. Different users have independent buckets.
 */
class ResolveRateLimitServiceTest {

    private ResolveRateLimitService service;

    @BeforeEach
    void setUp() {
        // Default values from PostsRateLimitConfig.Resolve: maxPerHour=30, bucketCacheSize=10_000.
        PostsRateLimitConfig config = new PostsRateLimitConfig();
        service = new ResolveRateLimitService(config);
    }

    @Test
    void consumes_token_per_call() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 30; i++) {
            assertThatCode(() -> service.checkAndConsume(userId)).doesNotThrowAnyException();
        }
        assertThatThrownBy(() -> service.checkAndConsume(userId))
                .isInstanceOf(PostsRateLimitException.class);
    }

    @Test
    void bucket_per_user() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        for (int i = 0; i < 30; i++) service.checkAndConsume(userA);

        // User A is exhausted, but user B still has the full quota.
        for (int i = 0; i < 30; i++) {
            assertThatCode(() -> service.checkAndConsume(userB)).doesNotThrowAnyException();
        }
        assertThatThrownBy(() -> service.checkAndConsume(userB))
                .isInstanceOf(PostsRateLimitException.class);
    }
}
