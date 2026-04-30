package com.worshiproom.legal;

import org.springframework.http.HttpStatus;

/**
 * Base exception for the Legal domain (Spec 1.10f).
 *
 * <p>Subclasses are thrown from {@link LegalController} (POST /me/legal/accept)
 * AND from {@link com.worshiproom.auth.AuthService} (registration version
 * validation). The {@link LegalExceptionHandler} is intentionally unscoped to
 * cover both throw sites.
 */
public class LegalException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public LegalException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
