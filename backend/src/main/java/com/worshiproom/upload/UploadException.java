package com.worshiproom.upload;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for upload-domain exceptions (Spec 4.6b). Subclasses set their
 * own HTTP status and machine-readable error code. Mapped to ProxyError by
 * UploadExceptionHandler.
 *
 * Mirrors the {@link com.worshiproom.post.PostException} shape — package-scoped
 * advice prevents cross-package contamination, so each domain redeclares its
 * own base class rather than sharing one across packages.
 */
public abstract class UploadException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected UploadException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
