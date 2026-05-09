package com.worshiproom.upload;

import org.springframework.http.HttpStatus;

/**
 * 429 RATE_LIMITED — user has exceeded the 10-uploads-per-hour limit.
 * Carries retryAfterSeconds for the {@code Retry-After} HTTP header.
 *
 * Mirrors {@link com.worshiproom.post.PostsRateLimitException} shape, with
 * upload-specific copy and a per-hour bucket.
 */
public class UploadRateLimitException extends UploadException {

    private final long retryAfterSeconds;

    public UploadRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
            "You've uploaded a lot of images recently. Try again in a bit.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
