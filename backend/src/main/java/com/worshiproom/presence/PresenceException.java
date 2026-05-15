package com.worshiproom.presence;

/**
 * Spec 6.11b — base type for exceptions raised by the {@code com.worshiproom.presence}
 * package. Caught by the package-scoped {@code PresenceExceptionHandler}.
 */
public class PresenceException extends RuntimeException {

    public PresenceException(String message) {
        super(message);
    }

    public PresenceException(String message, Throwable cause) {
        super(message, cause);
    }
}
