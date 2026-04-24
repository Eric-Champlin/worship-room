package com.worshiproom.user;

import org.springframework.http.HttpStatus;

/**
 * User-domain exceptions thrown from {@link UserService}. Maps to ProxyError
 * via {@link UserExceptionHandler} (package-scoped advice).
 *
 * Error codes: USER_NOT_FOUND (401), INVALID_INPUT (400).
 *
 * Distinct from {@link com.worshiproom.auth.AuthException} — auth covers
 * token / credential failures (filter-raised, unscoped advice); this covers
 * user-domain business rules (controller-raised, package-scoped advice).
 */
public class UserException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public UserException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    public static UserException userNotFound() {
        // 401 (not 404): per spec § Gotchas, the JWT subject is semantically
        // invalid if the user no longer exists. Force re-login rather than
        // surface a confusing 404 on a self-route.
        return new UserException(HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND",
            "Authenticated user not found.");
    }

    public static UserException invalidTimezone(String value) {
        return new UserException(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
            "Unknown timezone identifier: '" + value + "'");
    }

    public static UserException invalidDisplayNamePreference(String value) {
        return new UserException(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
            "Invalid display name preference: '" + value + "'. Must be one of: first_only, first_last_initial, first_last, custom.");
    }

    public static UserException customDisplayNameRequired() {
        return new UserException(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
            "Custom display name required when preference is 'custom'");
    }

    public static UserException fieldBlank(String field) {
        return new UserException(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
            field + " cannot be blank");
    }

    public static UserException nonNullableFieldNull(String field) {
        return new UserException(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
            field + " cannot be set to null");
    }
}
