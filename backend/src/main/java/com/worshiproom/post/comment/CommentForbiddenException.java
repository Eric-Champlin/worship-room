package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * 403 returned when a user attempts to PATCH or DELETE a comment they don't own
 * (and isn't an admin). Per Spec D8, returns FORBIDDEN even on already-soft-deleted
 * comments — UUIDs aren't enumerable, and the UX upside of telling a legitimate user
 * "this isn't yours" wins over the theoretical privacy leak.
 */
public class CommentForbiddenException extends CommentException {
    public CommentForbiddenException() {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN",
              "You don't have permission to modify this comment.");
    }
}
