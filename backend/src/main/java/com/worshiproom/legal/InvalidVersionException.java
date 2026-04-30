package com.worshiproom.legal;

import org.springframework.http.HttpStatus;

/**
 * 400 — version string fails format validation (defense-in-depth; the
 * {@code @Pattern} on the request DTO catches most cases first).
 */
public class InvalidVersionException extends LegalException {
    public InvalidVersionException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_VERSION", message);
    }
}
