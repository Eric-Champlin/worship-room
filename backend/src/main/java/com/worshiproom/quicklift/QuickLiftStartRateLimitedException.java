package com.worshiproom.quicklift;

import org.springframework.http.HttpStatus;

/**
 * Specialization of {@link QuickLiftException} for the rate-limited Quick Lift
 * start case (Spec 6.2 — 10/min per user in prod). Carries
 * {@code retryAfterSeconds} so {@link QuickLiftExceptionHandler} can emit
 * {@code Retry-After} on 429 responses. Constructed only via
 * {@link QuickLiftException#startRateLimited(long)}.
 */
public class QuickLiftStartRateLimitedException extends QuickLiftException {

    private final long retryAfterSeconds;

    QuickLiftStartRateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "QUICK_LIFT_START_RATE_LIMITED",
            "Too many Quick Lift starts. Please slow down.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
