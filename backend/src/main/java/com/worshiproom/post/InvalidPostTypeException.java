package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class InvalidPostTypeException extends PostException {
    public InvalidPostTypeException(String invalid) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Invalid postType value: " + invalid);
    }
}
