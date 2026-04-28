package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-day post creation limit.
 * Carries retryAfterSeconds for the {@code Retry-After} HTTP header.
 *
 * Subclass of PostException so the package-scoped PostExceptionHandler picks
 * it up. The handler reads getRetryAfterSeconds() to set the header.
 */
public class PostsRateLimitException extends PostException {

    private final long retryAfterSeconds;

    public PostsRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    /**
     * User-friendly time message. Conversions:
     *   < 60 sec    → "in less than a minute"
     *   < 3600 sec  → "in N minutes"
     *   else        → "in about N hours"
     */
    static String formatMessage(long seconds) {
        String when;
        if (seconds < 60) {
            when = "in less than a minute";
        } else if (seconds < 3600) {
            long minutes = Math.max(1, seconds / 60);
            when = "in " + minutes + (minutes == 1 ? " minute" : " minutes");
        } else {
            long hours = Math.max(1, seconds / 3600);
            when = "in about " + hours + (hours == 1 ? " hour" : " hours");
        }
        return "You've reached the daily limit of 5 prayer wall posts. Please try again " + when + ".";
    }
}
