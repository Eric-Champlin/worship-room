package com.worshiproom.post.comment;

import com.worshiproom.post.IdempotencyKeyMismatchException;
import com.worshiproom.post.comment.dto.CreateCommentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class CommentsIdempotencyServiceTest {

    private CommentsIdempotencyService service;

    @BeforeEach
    void setUp() {
        service = new CommentsIdempotencyService(new CommentsRateLimitConfig());
    }

    @Test
    void lookupHitReturnsCached() {
        UUID userA = UUID.randomUUID();
        CreateCommentResponse cached = mock(CreateCommentResponse.class);
        int hash = "request-body".hashCode();

        service.store(userA, "key-1", hash, cached);

        Optional<CreateCommentResponse> result = service.lookup(userA, "key-1", hash);
        assertThat(result).isPresent().get().isEqualTo(cached);
    }

    @Test
    void bodyHashMismatchThrows() {
        UUID userA = UUID.randomUUID();
        CreateCommentResponse cached = mock(CreateCommentResponse.class);

        service.store(userA, "key-1", 111, cached);

        assertThatThrownBy(() -> service.lookup(userA, "key-1", 222))
                .isInstanceOf(IdempotencyKeyMismatchException.class);
    }

    @Test
    void differentUsersIsolated() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        CreateCommentResponse cachedForA = mock(CreateCommentResponse.class);
        int hash = 12345;

        service.store(userA, "shared-key", hash, cachedForA);

        // Same key, different user → cache miss (no leak across users).
        Optional<CreateCommentResponse> result = service.lookup(userB, "shared-key", hash);
        assertThat(result).isEmpty();
    }

    @Test
    void nullKeyShortCircuitsToEmpty() {
        UUID userA = UUID.randomUUID();
        Optional<CreateCommentResponse> result = service.lookup(userA, null, 0);
        assertThat(result).isEmpty();
    }

    @Test
    void blankKeyShortCircuitsToEmpty() {
        UUID userA = UUID.randomUUID();
        Optional<CreateCommentResponse> result = service.lookup(userA, "   ", 0);
        assertThat(result).isEmpty();
    }
}
