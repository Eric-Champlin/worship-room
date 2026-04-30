package com.worshiproom.auth;

import org.springframework.http.HttpStatus;

/**
 * Specialization of {@link AuthException} for the locked-account case.
 *
 * Carries the {@code retryAfterSeconds} hint so {@link AuthExceptionHandler}
 * can emit a {@code Retry-After} response header on 423 responses.
 *
 * Constructed only via {@link AuthException#accountLocked(long)} factory.
 */
public class AccountLockedException extends AuthException {

    private final long retryAfterSeconds;

    AccountLockedException(long retryAfterSeconds) {
        super(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
            "Account temporarily locked due to repeated failed login attempts.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
