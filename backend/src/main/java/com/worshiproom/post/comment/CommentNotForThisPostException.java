package com.worshiproom.post.comment;

import com.worshiproom.post.PostException;
import org.springframework.http.HttpStatus;

/**
 * 400 returned when the comment referenced by PATCH /resolve does not belong
 * to the post indicated by the path. Spec 4.4 cross-resource validation.
 */
public class CommentNotForThisPostException extends PostException {
    public CommentNotForThisPostException() {
        super(
            HttpStatus.BAD_REQUEST,
            "COMMENT_POST_MISMATCH",
            "Comment does not belong to this post."
        );
    }
}
