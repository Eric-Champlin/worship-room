package com.worshiproom.legal;

import org.springframework.http.HttpStatus;

/**
 * 400 — submitted version doesn't equal current canonical version.
 *
 * <p>Thrown from BOTH {@link LegalController#acceptVersions} (POST /me/legal/accept)
 * AND {@link com.worshiproom.auth.AuthService#register} (registration version
 * validation). Caught by the unscoped {@link LegalExceptionHandler}.
 */
public class VersionMismatchException extends LegalException {
    public VersionMismatchException() {
        super(HttpStatus.BAD_REQUEST, "VERSION_MISMATCH",
            "The terms updated again while you were reading. Please review and accept the latest versions.");
    }
}
