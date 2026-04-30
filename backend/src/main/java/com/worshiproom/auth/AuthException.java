package com.worshiproom.auth;

import org.springframework.http.HttpStatus;

/**
 * Auth-domain exceptions thrown from JwtAuthenticationFilter and AuthService.
 * Deliberately not extending ProxyException — auth is its own domain, not part
 * of the proxy layer. AuthExceptionHandler (unscoped @RestControllerAdvice)
 * maps instances back to the shared ProxyError API response shape.
 *
 * Error codes: UNAUTHORIZED, TOKEN_INVALID, TOKEN_EXPIRED, TOKEN_MALFORMED,
 * INVALID_CREDENTIALS, ACCOUNT_LOCKED.
 */
public class AuthException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AuthException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    // Convenience factories — keep error codes in one place.
    public static AuthException unauthorized() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
            "Authentication is required to access this resource.");
    }
    public static AuthException tokenMalformed() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "TOKEN_MALFORMED",
            "Authentication token is malformed.");
    }
    public static AuthException tokenInvalid() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID",
            "Authentication token is invalid.");
    }
    public static AuthException tokenExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED",
            "Authentication token has expired.");
    }
    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
            "Invalid email or password.");
    }
    public static AccountLockedException accountLocked(long retryAfterSeconds) {
        return new AccountLockedException(Math.max(1L, retryAfterSeconds));
    }
}
