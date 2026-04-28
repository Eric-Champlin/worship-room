package com.worshiproom.post.engagement;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-hour reaction-write limit
 * (POST + DELETE on /api/v1/posts/{id}/reactions share the same 60/hour
 * bucket per Spec 3.7 D8). Carries retryAfterSeconds for the
 * {@code Retry-After} HTTP header.
 *
 * <p>Subclass of {@link EngagementException} so {@link EngagementExceptionHandler}
 * picks it up first (most-specific dispatch).
 */
public class ReactionsRateLimitException extends EngagementException {

    private final long retryAfterSeconds;

    public ReactionsRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    /**
     * User-friendly time message — anti-pressure tone (Universal Rule 12):
     * blameless, sentence case + period, no exclamation, no urgency.
     *
     * <p>Conversions match {@code CommentsRateLimitException.formatMessage}:
     * <ul>
     *   <li>{@code < 60 sec}    → "less than a minute"</li>
     *   <li>{@code < 3600 sec}  → "about N minute(s)"</li>
     *   <li>{@code >= 3600}     → "about N hour(s)"</li>
     * </ul>
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
        return "You're reacting a lot — please wait " + when + " before reacting again.";
    }
}
