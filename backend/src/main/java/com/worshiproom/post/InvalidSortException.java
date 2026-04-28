package com.worshiproom.post;

import org.springframework.http.HttpStatus;

public class InvalidSortException extends PostException {
    public InvalidSortException(String invalid) {
        super(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Invalid sort value: " + invalid);
    }
}
