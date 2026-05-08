package com.worshiproom.post;

import org.springframework.http.HttpStatus;

/**
 * 400 returned when a non-question post is targeted by PATCH /resolve.
 * Spec 4.4 — the resolve endpoint is question-only.
 */
public class PostNotAQuestionException extends PostException {
    public PostNotAQuestionException() {
        super(
            HttpStatus.BAD_REQUEST,
            "INVALID_POST_TYPE_FOR_RESOLVE",
            "Cannot resolve a non-question post."
        );
    }
}
