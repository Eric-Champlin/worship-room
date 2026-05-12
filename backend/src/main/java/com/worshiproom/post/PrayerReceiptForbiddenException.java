package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 403 returned when a non-author requests the Prayer Receipt of a post
 * (Spec 6.1, Gate-31).
 *
 * <p>The message is generic ("Forbidden.") — never reveals WHY the request
 * was denied. In particular, the message does NOT distinguish between
 * "post does not exist" and "you are not the author"; the controller maps
 * both cases to the same 403 surface (post-not-found is routed through
 * {@link PostNotFoundException} → 404, but anonymous-author traffic and
 * stale tokens land on this 403 with no hint).
 *
 * <p>Subclass of {@link PostException} so {@link PostExceptionHandler}'s
 * catch-all {@code handlePost} branch picks it up.
 */
public class PrayerReceiptForbiddenException extends PostException {

    public PrayerReceiptForbiddenException() {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden.");
    }
}
