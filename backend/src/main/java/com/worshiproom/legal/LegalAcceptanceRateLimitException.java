package com.worshiproom.legal;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-hour {@code /me/legal/accept}
 * limit (5 attempts/hour). Carries {@code retryAfterSeconds} for the
 * {@code Retry-After} header.
 *
 * <p>Subclass of {@link LegalException} so the unscoped
 * {@link LegalExceptionHandler} picks it up. The handler reads
 * {@link #getRetryAfterSeconds()} to set the header.
 *
 * <p>Wire code is {@code RATE_LIMITED} (canonical per
 * {@code backend/docs/api-error-codes.md}) — we do NOT introduce a parallel
 * {@code LEGAL_RATE_LIMITED} code.
 */
public class LegalAcceptanceRateLimitException extends LegalException {

    private final long retryAfterSeconds;

    public LegalAcceptanceRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    static String formatMessage(long seconds) {
        if (seconds < 60) {
            return "Please slow down a moment. You can try again in less than a minute.";
        }
        long minutes = Math.max(1, seconds / 60);
        return "Please slow down a moment. You can try again in "
            + minutes + (minutes == 1 ? " minute." : " minutes.");
    }
}
