package com.worshiproom.auth;

import org.springframework.http.HttpStatus;

/**
 * Specialization of {@link AuthException} for the rate-limited change-password
 * case (5 attempts per 15-min window per user — Spec 1.5c MPD-3 + D5).
 *
 * Carries the {@code retryAfterSeconds} hint so {@link AuthExceptionHandler}
 * can emit a {@code Retry-After} response header on 429 responses.
 *
 * Constructed only via {@link AuthException#changePasswordRateLimited(long)} factory.
 */
public class ChangePasswordRateLimitedException extends AuthException {

    private final long retryAfterSeconds;

    ChangePasswordRateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "CHANGE_PASSWORD_RATE_LIMITED",
            "Too many password-change attempts. Please try again later.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
