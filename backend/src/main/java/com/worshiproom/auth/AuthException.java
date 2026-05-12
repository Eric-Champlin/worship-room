package com.worshiproom.auth;

import org.springframework.http.HttpStatus;

/**
 * Auth-domain exceptions thrown from JwtAuthenticationFilter and AuthService.
 * Deliberately not extending ProxyException — auth is its own domain, not part
 * of the proxy layer. AuthExceptionHandler (unscoped @RestControllerAdvice)
 * maps instances back to the shared ProxyError API response shape.
 *
 * Error codes: UNAUTHORIZED, TOKEN_INVALID, TOKEN_EXPIRED, TOKEN_MALFORMED,
 * TOKEN_REVOKED, INVALID_CREDENTIALS, ACCOUNT_LOCKED, CURRENT_PASSWORD_INCORRECT,
 * PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED, SESSION_RATE_LIMITED.
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
    /**
     * Forums Wave Spec 1.5g — the token's {@code jti} is in the blocklist, OR the
     * token's {@code gen} claim no longer matches the user's {@code session_generation}
     * (logout-all or password-change rolled the counter forward). Frontend treats
     * this identically to TOKEN_EXPIRED: clear the stored JWT and surface the auth
     * modal. Anti-pressure copy: "This session has been signed out." — no surveillance
     * framing, no urgency.
     */
    public static AuthException tokenRevoked() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "TOKEN_REVOKED",
            "This session has been signed out.");
    }
    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
            "Invalid email or password.");
    }
    public static AccountLockedException accountLocked(long retryAfterSeconds) {
        return new AccountLockedException(Math.max(1L, retryAfterSeconds));
    }
    /**
     * 403 (not 401) by design. The caller IS authenticated — their JWT validated
     * fine; we just won't let them complete the action because they couldn't prove
     * they know the current password. 401 would trigger frontend `apiFetch`'s
     * global token-clear + `wr:auth-invalidated` dispatch (see
     * `frontend/src/lib/api-client.ts`), forcibly logging the user out on a wrong-
     * password attempt. 403 ("authenticated but forbidden") matches the security
     * boundary and lets the modal show the inline error without unmounting.
     */
    public static AuthException currentPasswordIncorrect() {
        return new AuthException(HttpStatus.FORBIDDEN, "CURRENT_PASSWORD_INCORRECT",
            "Your current password isn't correct.");
    }
    public static AuthException passwordsMustDiffer() {
        return new AuthException(HttpStatus.BAD_REQUEST, "PASSWORDS_MUST_DIFFER",
            "Your new password must differ from your current password.");
    }
    public static ChangePasswordRateLimitedException changePasswordRateLimited(long retryAfterSeconds) {
        return new ChangePasswordRateLimitedException(Math.max(1L, retryAfterSeconds));
    }
    /**
     * Forums Wave Spec 1.5g — too many calls to {@code /api/v1/sessions/*} within
     * the configured window. Per-user limit (10/hour by default).
     */
    public static SessionRateLimitedException sessionRateLimited(long retryAfterSeconds) {
        return new SessionRateLimitedException(Math.max(1L, retryAfterSeconds));
    }
}
