package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * 409 CONFLICT returned when an author attempts to edit a comment past the 5-minute
 * edit window. Spec 3.6 Decision D1 — uses CONFLICT (not 400) for parity with
 * Spec 3.5's {@code EditWindowExpiredException}, so frontend handles
 * {@code EDIT_WINDOW_EXPIRED} once across both posts and comments.
 */
public class CommentEditWindowExpiredException extends CommentException {
    public CommentEditWindowExpiredException() {
        super(HttpStatus.CONFLICT, "EDIT_WINDOW_EXPIRED",
              "Comments can be edited within 5 minutes of posting.");
    }
}
