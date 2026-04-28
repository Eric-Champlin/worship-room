package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * 400 returned when a comment's content exceeds the 5000-character limit
 * after OWASP HTML sanitization.
 *
 * <p>In normal operation this path is unreachable — the DTO's
 * {@code @Size(max = 5000)} validator rejects oversized payloads at the MVC
 * layer before the service runs, and OWASP sanitization only removes HTML
 * (it cannot expand content past the input length). The check exists as
 * defense in depth in case a future change bypasses bean validation.
 *
 * <p>Mirrors {@link com.worshiproom.post.ContentTooLongException} but with
 * a comment-specific message — the 5000-char limit differs from posts'
 * 2000-char limit, and surfacing the wrong limit to a user (or to a future
 * frontend that parses the message) is a real UX bug.
 */
public class CommentContentTooLongException extends CommentException {
    public CommentContentTooLongException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "Comment content exceeds the 5000 character limit after HTML sanitization.");
    }
}
