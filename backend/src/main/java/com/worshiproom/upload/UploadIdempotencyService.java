package com.worshiproom.upload;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.worshiproom.upload.dto.UploadResponse;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Per-user-per-key idempotency cache for {@code POST /api/v1/uploads/post-image}
 * (Spec 4.6b).
 *
 * <p>Mirrors {@link com.worshiproom.post.PostsIdempotencyService} — keyed by
 * {@code (userId, idempotencyKey)}, bounded Caffeine cache (max 10_000 entries,
 * 24h expireAfterWrite) per BOUNDED EXTERNAL-INPUT CACHES rule.
 *
 * <p>For multipart uploads, the body hash is a cheap composite of file size
 * and the first 4096 bytes (computed in the controller). This catches accidental
 * client retries without rehashing the full 5 MB body on every upload.
 */
@Service
public class UploadIdempotencyService {

    private final Cache<CacheKey, CachedEntry> cache;

    public UploadIdempotencyService() {
        this.cache = Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofHours(24))
                .build();
    }

    /**
     * Lookup before invoking the upload flow.
     *
     * @return cached UploadResponse if a matching (user, key, bodyHash) entry
     *         exists; empty otherwise.
     * @throws IdempotencyKeyMismatchException if (user, key) exists but bodyHash differs.
     */
    public Optional<UploadResponse> lookup(UUID userId, String idempotencyKey, int requestBodyHash) {
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
     * Store a successful response under the (user, key, bodyHash) composite.
     * No-op if idempotencyKey is null/blank.
     */
    public void store(UUID userId, String idempotencyKey, int requestBodyHash, UploadResponse response) {
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

    private record CachedEntry(int requestBodyHash, UploadResponse response) {}
}
