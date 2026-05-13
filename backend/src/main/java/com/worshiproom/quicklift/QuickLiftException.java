package com.worshiproom.quicklift;

import org.springframework.http.HttpStatus;

/**
 * QuickLift-domain exceptions thrown from QuickLiftService and QuickLiftController
 * (Spec 6.2). Maps via {@link QuickLiftExceptionHandler} to the project's
 * {@code ProxyError} response shape.
 *
 * Error codes: TIMING_TOO_EARLY, ALREADY_COMPLETED, ACTIVE_SESSION_EXISTS,
 * FORBIDDEN, NOT_FOUND, QUICK_LIFT_START_RATE_LIMITED, QUICK_LIFT_COMPLETE_RATE_LIMITED.
 *
 * <p>Mirrors the shape of {@link com.worshiproom.auth.AuthException}: a base
 * exception with factory methods + thin subclasses for rate-limit cases that
 * carry a {@code retryAfterSeconds} field for the {@code Retry-After} header.
 */
public class QuickLiftException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public QuickLiftException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    public static QuickLiftException timingTooEarly() {
        return new QuickLiftException(HttpStatus.BAD_REQUEST, "TIMING_TOO_EARLY",
            "Please wait the full 30 seconds before completing.");
    }

    public static QuickLiftException alreadyCompleted() {
        return new QuickLiftException(HttpStatus.CONFLICT, "ALREADY_COMPLETED",
            "This Quick Lift is already complete.");
    }

    public static QuickLiftException activeSessionExists() {
        return new QuickLiftException(HttpStatus.CONFLICT, "ACTIVE_SESSION_EXISTS",
            "You've already started a Quick Lift on this post — finish that one first.");
    }

    public static QuickLiftException forbidden() {
        return new QuickLiftException(HttpStatus.FORBIDDEN, "FORBIDDEN",
            "You cannot complete a session you did not start.");
    }

    public static QuickLiftException notFound() {
        return new QuickLiftException(HttpStatus.NOT_FOUND, "NOT_FOUND",
            "Resource not found.");
    }

    public static QuickLiftStartRateLimitedException startRateLimited(long retryAfterSeconds) {
        return new QuickLiftStartRateLimitedException(Math.max(1L, retryAfterSeconds));
    }

    public static QuickLiftCompleteRateLimitedException completeRateLimited(long retryAfterSeconds) {
        return new QuickLiftCompleteRateLimitedException(Math.max(1L, retryAfterSeconds));
    }
}
