package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-hour comment-write limit
 * (creates + edits + deletes share the same 30/hour bucket per master plan).
 * Carries retryAfterSeconds for the {@code Retry-After} HTTP header.
 *
 * <p>Subclass of {@link CommentException} so the package-scoped
 * {@code CommentExceptionHandler} picks it up. The handler reads
 * {@link #getRetryAfterSeconds()} to set the header.
 */
public class CommentsRateLimitException extends CommentException {

    private final long retryAfterSeconds;

    public CommentsRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", formatMessage(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }

    /**
     * User-friendly time message — anti-pressure tone (master plan Universal Rule 12):
     * blameless ("commenting a lot" not "you're spamming"), specific time guidance,
     * sentence case + period, no exclamation, no urgency.
     *
     * <p>Conversions:
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
        return "You're commenting a lot — please wait " + when + " before commenting again.";
    }
}
