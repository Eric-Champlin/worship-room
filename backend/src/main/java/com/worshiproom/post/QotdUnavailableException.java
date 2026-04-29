package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 404 returned when {@code GET /api/v1/qotd/today} cannot find an active
 * question for today's rotation slot — typically because the production seed
 * (Spec 3.9 changeset 2026-04-29-001) has not run, or because every row has
 * been toggled {@code is_active=false} via future admin tooling.
 *
 * <p>Subclass of {@link PostException} so the package-scoped
 * {@link PostExceptionHandler} maps it to a {@code ProxyError} response with
 * code {@code QOTD_UNAVAILABLE} automatically. Per Phase 3 Execution Reality
 * Addendum item 6, do NOT introduce a sibling {@code @RestControllerAdvice}.
 *
 * <p>The user-facing message follows the brand voice — matter-of-fact, no
 * apology, no urgency, no exclamation point.
 */
public class QotdUnavailableException extends PostException {
    public QotdUnavailableException() {
        super(HttpStatus.NOT_FOUND, "QOTD_UNAVAILABLE",
              "No question is available right now.");
    }
}
