package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class ContentTooLongException extends PostException {
    public ContentTooLongException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT",
              "Post content exceeds the 2000 character limit after HTML sanitization.");
    }
}
