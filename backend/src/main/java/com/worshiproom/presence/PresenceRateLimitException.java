package com.worshiproom.presence;

/**
 * Spec 6.11b — thrown when the per-bucket presence rate limit is exhausted.
 * Carries the recommended retry delay (seconds) and a tag for which bucket
 * tripped ({@code "auth"} or {@code "anon"}) so the controller advice can
 * emit a {@code Retry-After} header and the rate-limit logs can disambiguate.
 */
public class PresenceRateLimitException extends PresenceException {

    private final long retryAfterSeconds;
    private final String bucket;

    public PresenceRateLimitException(long retryAfterSeconds, String bucket) {
        super("Presence rate limit exceeded for bucket=" + bucket);
        this.retryAfterSeconds = retryAfterSeconds;
        this.bucket = bucket;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public String getBucket() {
        return bucket;
    }
}
