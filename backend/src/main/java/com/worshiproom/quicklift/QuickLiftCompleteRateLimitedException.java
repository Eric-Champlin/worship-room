package com.worshiproom.quicklift;

import org.springframework.http.HttpStatus;

/**
 * Specialization of {@link QuickLiftException} for the rate-limited Quick Lift
 * complete case (Spec 6.2 — 30/min per user defense-in-depth). Carries
 * {@code retryAfterSeconds} so {@link QuickLiftExceptionHandler} can emit
 * {@code Retry-After} on 429 responses. Constructed only via
 * {@link QuickLiftException#completeRateLimited(long)}.
 */
public class QuickLiftCompleteRateLimitedException extends QuickLiftException {

    private final long retryAfterSeconds;

    QuickLiftCompleteRateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "QUICK_LIFT_COMPLETE_RATE_LIMITED",
            "Too many requests. Please slow down.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
