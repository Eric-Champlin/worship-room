package com.worshiproom.auth;

import org.springframework.http.HttpStatus;

/**
 * Specialization of {@link AuthException} for rate-limited {@code /api/v1/sessions/*}
 * endpoint calls (10/hour per user by default — Spec 1.5g).
 *
 * <p>Carries the {@code retryAfterSeconds} hint so {@link AuthExceptionHandler}
 * can emit a {@code Retry-After} response header on 429 responses.
 *
 * <p>Constructed only via {@link AuthException#sessionRateLimited(long)} factory.
 */
public class SessionRateLimitedException extends AuthException {

    private final long retryAfterSeconds;

    SessionRateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "SESSION_RATE_LIMITED",
            "Too many session-management requests. Please try again later.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
