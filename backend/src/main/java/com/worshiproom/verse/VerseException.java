package com.worshiproom.verse;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for verse-domain exceptions (Spec 6.8). Subclasses set their own
 * HTTP status and machine-readable error code; mapped to ProxyError by
 * {@link VerseExceptionHandler}.
 *
 * <p>Mirrors the {@link com.worshiproom.post.PostException} shape — package-scoped
 * advice prevents cross-package contamination, so each domain redeclares its own
 * base class rather than sharing one across packages.
 */
public abstract class VerseException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected VerseException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
