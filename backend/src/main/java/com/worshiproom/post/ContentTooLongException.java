package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class ContentTooLongException extends PostException {
    public ContentTooLongException(int maxLength) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "Post content exceeds the " + maxLength + " character limit after HTML sanitization.");
    }
}
