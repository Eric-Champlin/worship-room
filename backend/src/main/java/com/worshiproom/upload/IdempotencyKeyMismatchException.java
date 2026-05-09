package com.worshiproom.upload;

import org.springframework.http.HttpStatus;

/**
 * 422 returned when the same Idempotency-Key is reused with a different
 * request body (Spec 4.6b). Indicates a client bug (key reuse with new intent).
 *
 * <p>Mirrors {@link com.worshiproom.post.IdempotencyKeyMismatchException} —
 * lives in the upload package because the upload-domain advice is
 * package-scoped and would not catch the post-domain class.
 */
public class IdempotencyKeyMismatchException extends UploadException {
    public IdempotencyKeyMismatchException() {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "IDEMPOTENCY_KEY_MISMATCH",
              "This Idempotency-Key was previously used with a different upload.");
    }
}
