package com.worshiproom.post.comment;

import org.springframework.http.HttpStatus;

/**
 * 400 returned when a comment's {@code content} is empty after HTML sanitization
 * — e.g., the user submitted only HTML tags or only whitespace.
 */
public class EmptyCommentContentException extends CommentException {
    public EmptyCommentContentException() {
        super(HttpStatus.BAD_REQUEST, "EMPTY_CONTENT",
              "Comment content cannot be empty.");
    }
}
