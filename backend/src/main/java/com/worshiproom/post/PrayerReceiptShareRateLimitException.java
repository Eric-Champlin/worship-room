package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when an author has shared the same post's prayer receipt more
 * than {@code maxPerPostPerDay} times in a 24-hour window (Spec 6.1, default
 * 5 per post per day). Carries {@code retryAfterSeconds} for the
 * {@code Retry-After} HTTP header.
 *
 * <p>Subclass of {@link PostException} so {@link PostExceptionHandler} catches
 * it. The handler has a dedicated branch for this exception that adds the
 * {@code Retry-After} header.
 */
public class PrayerReceiptShareRateLimitException extends PostException {

    private final long retryAfterSeconds;

    public PrayerReceiptShareRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    static String formatMessage(long seconds) {
        String when;
        if (seconds < 60) {
            when = "less than a minute";
        } else if (seconds < 3600) {
            long minutes = Math.max(1, seconds / 60);
            when = "about " + minutes + (minutes == 1 ? " minute" : " minutes");
        } else {
            long hours = Math.max(1, seconds / 3600);
            when = "about " + hours + (hours == 1 ? " hour" : " hours");
        }
        return "You've shared this prayer a lot today. Please try again in " + when + ".";
    }
}
