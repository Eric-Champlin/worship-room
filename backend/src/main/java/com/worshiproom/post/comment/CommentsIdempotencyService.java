package com.worshiproom.post.comment;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.worshiproom.post.IdempotencyKeyMismatchException;
import com.worshiproom.post.comment.dto.CreateCommentResponse;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Per-user-per-key idempotency cache for {@code POST /api/v1/posts/{postId}/comments}.
 *
 * <p>Keyed by {@code (userId, idempotencyKey)}. Bounded Caffeine cache
 * (max 10_000 entries, 24h expireAfterWrite) per BOUNDED EXTERNAL-INPUT CACHES.
 *
 * <p>Behavior mirrors {@link com.worshiproom.post.PostsIdempotencyService} —
 * separate cache instance, separate scope, but otherwise identical contract.
 * On hash mismatch, throws the shared {@link IdempotencyKeyMismatchException}
 * (422 IDEMPOTENCY_KEY_MISMATCH) — the frontend handles this code uniformly
 * across post and comment endpoints.
 */
@Service
public class CommentsIdempotencyService {

    private final Cache<CacheKey, CachedEntry> cache;

    public CommentsIdempotencyService(CommentsRateLimitConfig config) {
        this.cache = Caffeine.newBuilder()
                .maximumSize(config.getIdempotency().getCacheSize())
                .expireAfterWrite(Duration.ofHours(24))
                .build();
    }

    /**
     * Lookup before invoking the create flow.
     * @return the cached response if a matching (user, key, bodyHash) entry exists; empty otherwise.
     * @throws IdempotencyKeyMismatchException if (user, key) exists but bodyHash differs.
     */
    public Optional<CreateCommentResponse> lookup(UUID userId, String idempotencyKey, int requestBodyHash) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }
        CacheKey key = new CacheKey(userId, idempotencyKey);
        CachedEntry entry = cache.getIfPresent(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.requestBodyHash != requestBodyHash) {
            throw new IdempotencyKeyMismatchException();
        }
        return Optional.of(entry.response);
    }

    /**
     * Store a successful response under the (user, key, bodyHash) composite. No-op
     * if idempotencyKey is null/blank.
     */
    public void store(UUID userId, String idempotencyKey, int requestBodyHash, CreateCommentResponse response) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        cache.put(new CacheKey(userId, idempotencyKey), new CachedEntry(requestBodyHash, response));
    }

    private record CacheKey(UUID userId, String idempotencyKey) {
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof CacheKey other)) return false;
            return Objects.equals(userId, other.userId) && Objects.equals(idempotencyKey, other.idempotencyKey);
        }
        @Override
        public int hashCode() { return Objects.hash(userId, idempotencyKey); }
    }

    private record CachedEntry(int requestBodyHash, CreateCommentResponse response) {}
}
