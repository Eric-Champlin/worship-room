package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * Spec 6.5 — 429 when a user has exceeded the per-minute Intercessor Timeline
 * READ limit (default 60/min/user). Carries {@code retryAfterSeconds} for the
 * {@code Retry-After} HTTP header.
 *
 * <p>Subclass of {@link PostException}; {@link PostExceptionHandler} has a
 * dedicated branch that adds the {@code Retry-After} header.
 *
 * <p>Code is {@code INTERCESSOR_READ_RATE_LIMITED} — distinct from the generic
 * {@code RATE_LIMITED} so clients can distinguish this surface from others
 * (MPD-10).
 */
public class IntercessorReadRateLimitException extends PostException {

    private final long retryAfterSeconds;

    public IntercessorReadRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "INTERCESSOR_READ_RATE_LIMITED",
              formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    static String formatMessage(long seconds) {
        if (seconds < 60) return "Please wait a few seconds before checking again.";
        long minutes = Math.max(1, seconds / 60);
        return "Please wait about " + minutes + (minutes == 1 ? " minute" : " minutes") + " before checking again.";
    }
}
