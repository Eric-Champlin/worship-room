package com.worshiproom.social;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for social-domain exceptions. Subclasses set their own HTTP
 * status and machine-readable error code. Mapped to {@code ProxyError} by
 * {@link SocialExceptionHandler}.
 *
 * <p>Note: friends-domain exceptions
 * ({@link com.worshiproom.friends.SelfActionException},
 * {@link com.worshiproom.friends.UserNotFoundException},
 * {@link com.worshiproom.friends.InvalidInputException}) are REUSED from the
 * social package via cross-package import. Those throws are caught by the
 * deliberately-unscoped {@link com.worshiproom.friends.FriendsExceptionHandler}.
 * Only the social-specific cases below need package-local exception classes.
 */
public abstract class SocialException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected SocialException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
