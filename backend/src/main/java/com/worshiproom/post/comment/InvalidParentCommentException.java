package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * 400 returned when {@code parentCommentId} on a create-comment request does not
 * reference a live comment on the same post. Covers three cases: parent comment
 * doesn't exist, parent comment is soft-deleted, parent comment exists on a
 * different post (cross-post phantom thread — Spec D11).
 */
public class InvalidParentCommentException extends CommentException {
    public InvalidParentCommentException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "The parent comment doesn't exist on this post or has been deleted.");
    }
}
