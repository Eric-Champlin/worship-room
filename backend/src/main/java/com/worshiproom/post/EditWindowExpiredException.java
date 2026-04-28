package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 409 returned when a PATCH request attempts a non-exempt edit on a post
 * older than the configured edit window (default 5 minutes).
 *
 * Window-exempt operations: is_answered toggle, answered_text.
 * Window-gated operations: content, category, qotdId, challengeId,
 * scripture fields, visibility-upgrade.
 */
public class EditWindowExpiredException extends PostException {
    public EditWindowExpiredException() {
        super(HttpStatus.CONFLICT, "EDIT_WINDOW_EXPIRED",
              "This post is no longer editable. Posts can be edited within 5 minutes of creation.");
    }
}
