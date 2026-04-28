package com.worshiproom.post.comment;

import com.worshiproom.post.PostException;
import org.springframework.http.HttpStatus;

/**
 * 404 returned when a comment does not exist, is soft-deleted, or fails its
 * post's visibility predicate. Anti-enumeration — no differential between
 * forbidden and missing.
 *
 * <p>Shipped in Spec 3.4 because Spec 3.6 (comment writes) needs the same
 * exception class for PATCH/DELETE endpoints.
 */
public class PostCommentNotFoundException extends PostException {
    public PostCommentNotFoundException() {
        super(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "Comment not found");
    }
}
