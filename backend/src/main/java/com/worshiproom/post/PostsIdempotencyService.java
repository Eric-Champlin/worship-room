package com.worshiproom.post;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.worshiproom.post.dto.CreatePostResponse;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Per-user-per-key idempotency cache for POST /api/v1/posts.
 *
 * <p>Keyed by {@code (userId, idempotencyKey)}. Bounded Caffeine cache
 * (max 10_000 entries, 24h expireAfterWrite) per BOUNDED EXTERNAL-INPUT CACHES.
 *
 * <p>Behavior:
 * <ul>
 *   <li>First call with key K for user U: store {@code (key, requestBodyHash, response)} and return empty.</li>
 *   <li>Subsequent call with same (U, K) and SAME body hash: return cached response.</li>
 *   <li>Subsequent call with same (U, K) and DIFFERENT body hash: throw IdempotencyKeyMismatchException.</li>
 *   <li>If the key is null: cache lookup short-circuits to empty (no caching for keyless requests).</li>
 * </ul>
 *
 * <p>Body hash is the {@code Object.hashCode()} of the {@link com.worshiproom.post.dto.CreatePostRequest} record
 * (Java records have value-based hashCode that includes all fields).
 */
@Service
public class PostsIdempotencyService {

    private final Cache<CacheKey, CachedEntry> cache;

    public PostsIdempotencyService(PostsRateLimitConfig config) {
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
    public Optional<CreatePostResponse> lookup(UUID userId, String idempotencyKey, int requestBodyHash) {
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
    public void store(UUID userId, String idempotencyKey, int requestBodyHash, CreatePostResponse response) {
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

    private record CachedEntry(int requestBodyHash, CreatePostResponse response) {}
}
