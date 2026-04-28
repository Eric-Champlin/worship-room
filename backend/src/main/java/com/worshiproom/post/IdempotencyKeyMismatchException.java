package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 422 returned when the same Idempotency-Key is reused with a different
 * request body. Indicates a client bug (key reuse with new intent).
 */
public class IdempotencyKeyMismatchException extends PostException {
    public IdempotencyKeyMismatchException() {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "IDEMPOTENCY_KEY_MISMATCH",
              "This Idempotency-Key was previously used with a different request body.");
    }
}
