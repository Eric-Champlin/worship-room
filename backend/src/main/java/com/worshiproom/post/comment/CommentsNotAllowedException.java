package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

public class CommentsNotAllowedException extends CommentException {

    public CommentsNotAllowedException() {
        super(HttpStatus.BAD_REQUEST, "COMMENTS_NOT_ALLOWED",
              "Comments are not enabled for encouragements.");
    }
}
