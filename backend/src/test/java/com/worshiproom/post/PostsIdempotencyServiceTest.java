package com.worshiproom.post;

import com.worshiproom.post.dto.CreatePostResponse;
import com.worshiproom.post.dto.PostDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostsIdempotencyServiceTest {

    private PostsIdempotencyService service;

    @BeforeEach
    void setUp() {
        service = new PostsIdempotencyService(new PostsRateLimitConfig());
    }

    @Test
    void lookup_emptyCache_returnsEmpty() {
        UUID userId = UUID.randomUUID();
        assertThat(service.lookup(userId, "key-1", 12345)).isEmpty();
    }

    @Test
    void store_then_lookup_sameUserKeyHash_returnsCached() {
        UUID userId = UUID.randomUUID();
        CreatePostResponse response = sampleResponse();
        service.store(userId, "key-1", 12345, response);

        assertThat(service.lookup(userId, "key-1", 12345)).contains(response);
    }

    @Test
    void lookup_sameKeyDifferentBodyHash_throwsMismatch() {
        UUID userId = UUID.randomUUID();
        service.store(userId, "key-1", 12345, sampleResponse());

        assertThatThrownBy(() -> service.lookup(userId, "key-1", 99999))
                .isInstanceOf(IdempotencyKeyMismatchException.class);
    }

    @Test
    void lookup_sameKeyDifferentUsers_isolated() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        CreatePostResponse responseA = sampleResponse();
        service.store(userA, "shared-key", 12345, responseA);

        // userB asking for the same key should miss (no cache entry for user B).
        assertThat(service.lookup(userB, "shared-key", 99999)).isEmpty();
    }

    @Test
    void lookup_nullKey_returnsEmpty_evenIfStoreCalledWithSameKey() {
        UUID userId = UUID.randomUUID();
        service.store(userId, null, 12345, sampleResponse());
        assertThat(service.lookup(userId, null, 12345)).isEmpty();
    }

    private CreatePostResponse sampleResponse() {
        PostDto dto = new PostDto(
                UUID.randomUUID(), "prayer_request", "test", "health",
                false, null, null, null, null,
                "public", false, null, null, "approved", false,
                0, 0, 0, 0,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(), null,
                null,
                null,
                java.util.Set.of()
        );
        return new CreatePostResponse(dto, null, java.util.Map.of("requestId", "rid"));
    }
}
