package com.worshiproom.mute;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for mute-domain exceptions. Subclasses set their own HTTP status
 * and machine-readable error code. Mapped to ProxyError by MuteExceptionHandler.
 *
 * <p>Mute mirrors the friends-domain exception classes by design (same HTTP code,
 * same error code values for the shared semantics). The friends versions are NOT
 * reused because cross-package exception inheritance would require unscoping the
 * mute advice (see 03-backend-standards.md § "@RestControllerAdvice Scoping").
 * Three lines of duplication is the right cost.
 */
public abstract class MuteException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected MuteException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
