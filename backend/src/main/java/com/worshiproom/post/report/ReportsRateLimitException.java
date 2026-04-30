package com.worshiproom.post.report;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-hour report-write limit
 * (post-reports + comment-reports SHARE the same 10/hour bucket per Spec
 * 3.8 D6). Carries retryAfterSeconds for the {@code Retry-After} HTTP
 * header.
 *
 * <p>Subclass of {@link ReportException} so {@code ReportExceptionHandler}
 * picks it up first via most-specific dispatch and adds the
 * {@code Retry-After} header.
 */
public class ReportsRateLimitException extends ReportException {

    private final long retryAfterSeconds;

    public ReportsRateLimitException(long retryAfterSeconds) {
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
        return "You're submitting reports quickly — please wait " + when + " before trying again.";
    }
}
