package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class EmptyContentException extends PostException {
    public EmptyContentException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "Post content cannot be empty after HTML sanitization.");
    }
}
