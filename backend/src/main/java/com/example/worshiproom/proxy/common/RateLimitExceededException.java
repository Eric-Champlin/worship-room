package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

public class RateLimitExceededException extends ProxyException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(long retryAfterSeconds) {
        super(
            HttpStatus.TOO_MANY_REQUESTS,
            "RATE_LIMITED",
            "Too many requests. Try again in " + retryAfterSeconds + " seconds."
        );
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
