package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class InvalidCategoryException extends PostException {
    public InvalidCategoryException(String invalid) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Invalid category value: " + invalid);
    }
}
