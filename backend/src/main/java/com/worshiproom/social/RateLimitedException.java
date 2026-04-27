package com.worshiproom.social;

import org.springframework.http.HttpStatus;

public class RateLimitedException extends SocialException {
    public RateLimitedException(String message) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", message);
    }
}
