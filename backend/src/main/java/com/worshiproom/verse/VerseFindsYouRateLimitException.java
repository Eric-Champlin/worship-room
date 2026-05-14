package com.worshiproom.verse;

import org.springframework.http.HttpStatus;

/**
 * 429 returned when a user has exceeded the per-hour Verse-Finds-You request
 * limit (10/hr/user per Spec 6.8 §"Rate limits"). Carries
 * {@code retryAfterSeconds} for the {@code Retry-After} HTTP header.
 *
 * <p>Subclass of {@link VerseException} so the package-scoped
 * {@link VerseExceptionHandler} picks it up. The handler reads
 * {@link #getRetryAfterSeconds()} to set the header.
 */
public class VerseFindsYouRateLimitException extends VerseException {

    private final long retryAfterSeconds;

    public VerseFindsYouRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS,
              "RATE_LIMITED",
              "Too many requests. Please try again later.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
