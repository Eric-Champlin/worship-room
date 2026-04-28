package com.worshiproom.post.engagement;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-hour bookmark-write limit
 * (POST + DELETE on /api/v1/posts/{id}/bookmark share the same 60/hour
 * bucket per Spec 3.7 D8). Carries retryAfterSeconds for the
 * {@code Retry-After} HTTP header.
 *
 * <p>Subclass of {@link EngagementException} so {@link EngagementExceptionHandler}
 * picks it up first (most-specific dispatch).
 */
public class BookmarksRateLimitException extends EngagementException {

    private final long retryAfterSeconds;

    public BookmarksRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    /**
     * User-friendly time message — anti-pressure tone (Universal Rule 12):
     * blameless, sentence case + period, no exclamation, no urgency.
     */
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
        return "You're bookmarking a lot — please wait " + when + " before bookmarking again.";
    }
}
