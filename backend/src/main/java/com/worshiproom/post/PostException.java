package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for post-domain exceptions. Subclasses set their own HTTP status
 * and machine-readable error code. Mapped to ProxyError by PostExceptionHandler.
 *
 * Mirrors the {@link com.worshiproom.mute.MuteException} shape — package-scoped
 * advice prevents cross-package contamination, so each domain redeclares its
 * own base class rather than sharing one across packages.
 */
public abstract class PostException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected PostException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
