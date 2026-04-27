package com.worshiproom.friends;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for friends-domain exceptions. Subclasses set their own HTTP status
 * and machine-readable error code. Mapped to ProxyError by FriendsExceptionHandler
 * (created in Spec 2.5.3).
 */
public abstract class FriendsException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected FriendsException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
