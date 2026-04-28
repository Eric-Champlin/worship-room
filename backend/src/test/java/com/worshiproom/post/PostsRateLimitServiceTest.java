package com.worshiproom.post;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostsRateLimitServiceTest {

    private PostsRateLimitService service;

    @BeforeEach
    void setUp() {
        PostsRateLimitConfig config = new PostsRateLimitConfig();
        // Default values from PostsRateLimitConfig: maxPerDay=5, bucketCacheSize=10_000.
        service = new PostsRateLimitService(config);
    }

    @Test
    void checkAndConsume_first5ConsumptionsForSameUser_succeed() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            assertThatCode(() -> service.checkAndConsume(userId)).doesNotThrowAnyException();
        }
    }

    @Test
    void checkAndConsume_sixthConsumptionForSameUser_throws() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) service.checkAndConsume(userId);

        assertThatThrownBy(() -> service.checkAndConsume(userId))
                .isInstanceOf(PostsRateLimitException.class);
    }

    @Test
    void checkAndConsume_429ExceptionCarriesRetryAfter() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) service.checkAndConsume(userId);

        assertThatThrownBy(() -> service.checkAndConsume(userId))
                .isInstanceOfSatisfying(PostsRateLimitException.class, ex ->
                        assertThat(ex.getRetryAfterSeconds()).isPositive());
    }

    @Test
    void checkAndConsume_differentUsers_independentBuckets() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        for (int i = 0; i < 5; i++) service.checkAndConsume(userA);

        // userB still has full quota.
        for (int i = 0; i < 5; i++) {
            assertThatCode(() -> service.checkAndConsume(userB)).doesNotThrowAnyException();
        }
    }

    @Test
    void checkAndConsume_customMaxPerDay_honored() {
        PostsRateLimitConfig config = new PostsRateLimitConfig();
        config.getRateLimit().setMaxPerDay(2);
        PostsRateLimitService customService = new PostsRateLimitService(config);
        UUID userId = UUID.randomUUID();

        customService.checkAndConsume(userId);
        customService.checkAndConsume(userId);

        assertThatThrownBy(() -> customService.checkAndConsume(userId))
                .isInstanceOf(PostsRateLimitException.class);
    }

    @Test
    void checkAndConsume_messageContainsHumanFriendlyTime() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 5; i++) service.checkAndConsume(userId);

        assertThatThrownBy(() -> service.checkAndConsume(userId))
                .isInstanceOf(PostsRateLimitException.class)
                .hasMessageContaining("daily limit of 5")
                .hasMessageMatching(".*(in less than a minute|in \\d+ minutes?|in about \\d+ hours?)\\.$");
    }
}
