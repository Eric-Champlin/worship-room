package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * Spec 7.4 — Thrown when a user exceeds the per-user rate limit on
 * {@code GET /api/v1/users/me/friend-prayers-today}. Carries the retry-after
 * window so {@link PostExceptionHandler} can emit the {@code Retry-After}
 * header. Mirrors {@link PostsRateLimitException}'s shape; the dedicated
 * handler in {@code PostExceptionHandler} catches this subclass first via
 * most-specific-handler dispatch.
 */
public class FriendPrayersRateLimitedException extends PostException {

    private final long retryAfterSeconds;

    public FriendPrayersRateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Please slow down. Try again in a moment.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
